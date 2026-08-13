#!/usr/bin/env bash
# Scaffolds a new hexagonal module with full CRUD.
# Usage:   ./scripts/new-module.sh <singular> [plural]
# Example: ./scripts/new-module.sh order orders
#          ./scripts/new-module.sh category categories

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <singular> [plural]"
  echo "Example: $0 order orders"
  exit 1
fi

SINGULAR="$1"
PLURAL="${2:-${SINGULAR}s}"

to_pascal() {
  echo "$1" | awk -F'[-_]' '{for(i=1;i<=NF;i++) printf "%s%s", toupper(substr($i,1,1)), substr($i,2)}'
}
to_upper_snake() {
  echo "$1" | tr '-' '_' | tr '[:lower:]' '[:upper:]'
}

PASCAL=$(to_pascal "$SINGULAR")
PASCAL_PLURAL=$(to_pascal "$PLURAL")
UPPER=$(to_upper_snake "$SINGULAR")

ROOT="src/modules/${PLURAL}"

if [ -d "$ROOT" ]; then
  echo "❌ Module already exists: $ROOT"
  exit 1
fi

echo "📦 Creating module:"
echo "  folder        $ROOT"
echo "  entity        $PASCAL"
echo "  module class  ${PASCAL_PLURAL}Module"
echo "  repo token    ${UPPER}_REPOSITORY"
echo "  table         $PLURAL"
echo ""

mkdir -p "$ROOT/domain/entities" \
         "$ROOT/domain/ports" \
         "$ROOT/domain/exceptions" \
         "$ROOT/application/dtos" \
         "$ROOT/application/use-cases" \
         "$ROOT/infrastructure/http" \
         "$ROOT/infrastructure/persistence"

# ─────────────── domain ───────────────

cat > "$ROOT/domain/entities/${SINGULAR}.entity.ts" <<EOF
import { Invalid${PASCAL}DataException } from '../exceptions/${SINGULAR}.exceptions';

export interface ${PASCAL}Props {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ${PASCAL} {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ${PASCAL}Props) {
    this.id = props.id;
    this.name = props.name;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: ${PASCAL}Props): ${PASCAL} {
    if (props.name.trim().length === 0) {
      throw new Invalid${PASCAL}DataException('name cannot be empty');
    }
    return new ${PASCAL}(props);
  }

  rename(name: string): ${PASCAL} {
    return ${PASCAL}.create({ ...this, name, updatedAt: new Date() });
  }
}
EOF

cat > "$ROOT/domain/ports/${SINGULAR}.repository.ts" <<EOF
import { ${PASCAL} } from '../entities/${SINGULAR}.entity';

export const ${UPPER}_REPOSITORY = Symbol('${UPPER}_REPOSITORY');

export interface ${PASCAL}Repository {
  findAll(): Promise<${PASCAL}[]>;
  findById(id: string): Promise<${PASCAL} | null>;
  save(entity: ${PASCAL}): Promise<${PASCAL}>;
  update(entity: ${PASCAL}): Promise<${PASCAL}>;
  delete(id: string): Promise<void>;
}
EOF

cat > "$ROOT/domain/exceptions/${SINGULAR}.exceptions.ts" <<EOF
import { HttpStatus } from '@nestjs/common';
import { DomainException } from '@shared/domain/domain.exception';

export class ${PASCAL}NotFoundException extends DomainException {
  readonly code = '${UPPER}_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(id: string) {
    super(\`${PASCAL} with id \${id} not found\`, { id });
  }
}

export class Invalid${PASCAL}DataException extends DomainException {
  readonly code = 'INVALID_${UPPER}_DATA';
  readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(reason: string) {
    super(\`Invalid ${SINGULAR} data: \${reason}\`, { reason });
  }
}
EOF

# ─────────────── application ───────────────

cat > "$ROOT/application/dtos/create-${SINGULAR}.dto.ts" <<EOF
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class Create${PASCAL}Dto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;
}
EOF

cat > "$ROOT/application/dtos/update-${SINGULAR}.dto.ts" <<EOF
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class Update${PASCAL}Dto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
EOF

cat > "$ROOT/application/dtos/${SINGULAR}.response.ts" <<EOF
import { ApiProperty } from '@nestjs/swagger';
import { ${PASCAL} } from '../../domain/entities/${SINGULAR}.entity';

export class ${PASCAL}Response {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static fromDomain(entity: ${PASCAL}): ${PASCAL}Response {
    return {
      id: entity.id,
      name: entity.name,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
EOF

cat > "$ROOT/application/use-cases/create-${SINGULAR}.use-case.ts" <<EOF
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ${PASCAL} } from '../../domain/entities/${SINGULAR}.entity';
import { ${UPPER}_REPOSITORY, type ${PASCAL}Repository } from '../../domain/ports/${SINGULAR}.repository';
import { Create${PASCAL}Dto } from '../dtos/create-${SINGULAR}.dto';

@Injectable()
export class Create${PASCAL}UseCase {
  constructor(@Inject(${UPPER}_REPOSITORY) private readonly repo: ${PASCAL}Repository) {}

  async execute(dto: Create${PASCAL}Dto): Promise<${PASCAL}> {
    const now = new Date();
    const entity = ${PASCAL}.create({
      id: randomUUID(),
      name: dto.name,
      createdAt: now,
      updatedAt: now,
    });
    return this.repo.save(entity);
  }
}
EOF

cat > "$ROOT/application/use-cases/get-${SINGULAR}.use-case.ts" <<EOF
import { Inject, Injectable } from '@nestjs/common';
import { ${PASCAL} } from '../../domain/entities/${SINGULAR}.entity';
import { ${PASCAL}NotFoundException } from '../../domain/exceptions/${SINGULAR}.exceptions';
import { ${UPPER}_REPOSITORY, type ${PASCAL}Repository } from '../../domain/ports/${SINGULAR}.repository';

@Injectable()
export class Get${PASCAL}UseCase {
  constructor(@Inject(${UPPER}_REPOSITORY) private readonly repo: ${PASCAL}Repository) {}

  async execute(id: string): Promise<${PASCAL}> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new ${PASCAL}NotFoundException(id);
    return entity;
  }
}
EOF

cat > "$ROOT/application/use-cases/list-${PLURAL}.use-case.ts" <<EOF
import { Inject, Injectable } from '@nestjs/common';
import { ${PASCAL} } from '../../domain/entities/${SINGULAR}.entity';
import { ${UPPER}_REPOSITORY, type ${PASCAL}Repository } from '../../domain/ports/${SINGULAR}.repository';

@Injectable()
export class List${PASCAL_PLURAL}UseCase {
  constructor(@Inject(${UPPER}_REPOSITORY) private readonly repo: ${PASCAL}Repository) {}

  execute(): Promise<${PASCAL}[]> {
    return this.repo.findAll();
  }
}
EOF

cat > "$ROOT/application/use-cases/update-${SINGULAR}.use-case.ts" <<EOF
import { Inject, Injectable } from '@nestjs/common';
import { ${PASCAL} } from '../../domain/entities/${SINGULAR}.entity';
import { ${PASCAL}NotFoundException } from '../../domain/exceptions/${SINGULAR}.exceptions';
import { ${UPPER}_REPOSITORY, type ${PASCAL}Repository } from '../../domain/ports/${SINGULAR}.repository';
import { Update${PASCAL}Dto } from '../dtos/update-${SINGULAR}.dto';

@Injectable()
export class Update${PASCAL}UseCase {
  constructor(@Inject(${UPPER}_REPOSITORY) private readonly repo: ${PASCAL}Repository) {}

  async execute(id: string, dto: Update${PASCAL}Dto): Promise<${PASCAL}> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new ${PASCAL}NotFoundException(id);
    const updated = dto.name ? entity.rename(dto.name) : entity;
    return this.repo.update(updated);
  }
}
EOF

cat > "$ROOT/application/use-cases/delete-${SINGULAR}.use-case.ts" <<EOF
import { Inject, Injectable } from '@nestjs/common';
import { ${PASCAL}NotFoundException } from '../../domain/exceptions/${SINGULAR}.exceptions';
import { ${UPPER}_REPOSITORY, type ${PASCAL}Repository } from '../../domain/ports/${SINGULAR}.repository';

@Injectable()
export class Delete${PASCAL}UseCase {
  constructor(@Inject(${UPPER}_REPOSITORY) private readonly repo: ${PASCAL}Repository) {}

  async execute(id: string): Promise<void> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new ${PASCAL}NotFoundException(id);
    await this.repo.delete(id);
  }
}
EOF

# ─────────────── infrastructure ───────────────

cat > "$ROOT/infrastructure/persistence/${SINGULAR}.schema.ts" <<EOF
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const ${PLURAL} = pgTable('${PLURAL}', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ${PASCAL}Row = typeof ${PLURAL}.\$inferSelect;
export type New${PASCAL}Row = typeof ${PLURAL}.\$inferInsert;
EOF

cat > "$ROOT/infrastructure/persistence/${SINGULAR}.mapper.ts" <<EOF
import { ${PASCAL} } from '../../domain/entities/${SINGULAR}.entity';
import type { New${PASCAL}Row, ${PASCAL}Row } from './${SINGULAR}.schema';

export const ${PASCAL}Mapper = {
  toDomain(row: ${PASCAL}Row): ${PASCAL} {
    return ${PASCAL}.create({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },

  toPersistence(entity: ${PASCAL}): New${PASCAL}Row {
    return {
      id: entity.id,
      name: entity.name,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  },
};
EOF

cat > "$ROOT/infrastructure/persistence/drizzle-${SINGULAR}.repository.ts" <<EOF
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@shared/database/database.tokens';
import type { Database } from '@shared/database/database.module';
import { ${PASCAL} } from '../../domain/entities/${SINGULAR}.entity';
import { ${PASCAL}Repository } from '../../domain/ports/${SINGULAR}.repository';
import { ${PLURAL} } from './${SINGULAR}.schema';
import { ${PASCAL}Mapper } from './${SINGULAR}.mapper';

@Injectable()
export class Drizzle${PASCAL}Repository implements ${PASCAL}Repository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findAll(): Promise<${PASCAL}[]> {
    const rows = await this.db.select().from(${PLURAL});
    return rows.map(${PASCAL}Mapper.toDomain);
  }

  async findById(id: string): Promise<${PASCAL} | null> {
    const [row] = await this.db.select().from(${PLURAL}).where(eq(${PLURAL}.id, id)).limit(1);
    return row ? ${PASCAL}Mapper.toDomain(row) : null;
  }

  async save(entity: ${PASCAL}): Promise<${PASCAL}> {
    const [row] = await this.db.insert(${PLURAL}).values(${PASCAL}Mapper.toPersistence(entity)).returning();
    return ${PASCAL}Mapper.toDomain(row);
  }

  async update(entity: ${PASCAL}): Promise<${PASCAL}> {
    const [row] = await this.db
      .update(${PLURAL})
      .set({ name: entity.name, updatedAt: entity.updatedAt })
      .where(eq(${PLURAL}.id, entity.id))
      .returning();
    return ${PASCAL}Mapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(${PLURAL}).where(eq(${PLURAL}.id, id));
  }
}
EOF

cat > "$ROOT/infrastructure/http/${SINGULAR}.controller.ts" <<EOF
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Create${PASCAL}Dto } from '../../application/dtos/create-${SINGULAR}.dto';
import { Update${PASCAL}Dto } from '../../application/dtos/update-${SINGULAR}.dto';
import { ${PASCAL}Response } from '../../application/dtos/${SINGULAR}.response';
import { Create${PASCAL}UseCase } from '../../application/use-cases/create-${SINGULAR}.use-case';
import { Delete${PASCAL}UseCase } from '../../application/use-cases/delete-${SINGULAR}.use-case';
import { Get${PASCAL}UseCase } from '../../application/use-cases/get-${SINGULAR}.use-case';
import { List${PASCAL_PLURAL}UseCase } from '../../application/use-cases/list-${PLURAL}.use-case';
import { Update${PASCAL}UseCase } from '../../application/use-cases/update-${SINGULAR}.use-case';

@ApiTags('${PLURAL}')
@ApiBearerAuth()
@Controller('${PLURAL}')
export class ${PASCAL}Controller {
  constructor(
    private readonly create${PASCAL}: Create${PASCAL}UseCase,
    private readonly get${PASCAL}: Get${PASCAL}UseCase,
    private readonly list${PASCAL_PLURAL}: List${PASCAL_PLURAL}UseCase,
    private readonly update${PASCAL}: Update${PASCAL}UseCase,
    private readonly delete${PASCAL}: Delete${PASCAL}UseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a ${SINGULAR}' })
  async create(@Body() dto: Create${PASCAL}Dto): Promise<${PASCAL}Response> {
    const entity = await this.create${PASCAL}.execute(dto);
    return ${PASCAL}Response.fromDomain(entity);
  }

  @Get()
  @ApiOperation({ summary: 'List all ${PLURAL}' })
  async list(): Promise<${PASCAL}Response[]> {
    const items = await this.list${PASCAL_PLURAL}.execute();
    return items.map(${PASCAL}Response.fromDomain);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ${SINGULAR} by id' })
  async getOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<${PASCAL}Response> {
    const entity = await this.get${PASCAL}.execute(id);
    return ${PASCAL}Response.fromDomain(entity);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a ${SINGULAR}' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: Update${PASCAL}Dto,
  ): Promise<${PASCAL}Response> {
    const entity = await this.update${PASCAL}.execute(id, dto);
    return ${PASCAL}Response.fromDomain(entity);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a ${SINGULAR}' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.delete${PASCAL}.execute(id);
  }
}
EOF

# ─────────────── module ───────────────

cat > "$ROOT/${PLURAL}.module.ts" <<EOF
import { Module } from '@nestjs/common';
import { ${UPPER}_REPOSITORY } from './domain/ports/${SINGULAR}.repository';
import { Create${PASCAL}UseCase } from './application/use-cases/create-${SINGULAR}.use-case';
import { Delete${PASCAL}UseCase } from './application/use-cases/delete-${SINGULAR}.use-case';
import { Get${PASCAL}UseCase } from './application/use-cases/get-${SINGULAR}.use-case';
import { List${PASCAL_PLURAL}UseCase } from './application/use-cases/list-${PLURAL}.use-case';
import { Update${PASCAL}UseCase } from './application/use-cases/update-${SINGULAR}.use-case';
import { ${PASCAL}Controller } from './infrastructure/http/${SINGULAR}.controller';
import { Drizzle${PASCAL}Repository } from './infrastructure/persistence/drizzle-${SINGULAR}.repository';

@Module({
  controllers: [${PASCAL}Controller],
  providers: [
    Create${PASCAL}UseCase,
    Get${PASCAL}UseCase,
    List${PASCAL_PLURAL}UseCase,
    Update${PASCAL}UseCase,
    Delete${PASCAL}UseCase,
    { provide: ${UPPER}_REPOSITORY, useClass: Drizzle${PASCAL}Repository },
  ],
})
export class ${PASCAL_PLURAL}Module {}
EOF

# ─────────────── auto-wire schema + app.module ───────────────

SCHEMA_FILE="src/shared/database/schema.ts"
SCHEMA_LINE="export * from '@modules/${PLURAL}/infrastructure/persistence/${SINGULAR}.schema';"
if ! grep -qF "$SCHEMA_LINE" "$SCHEMA_FILE" 2>/dev/null; then
  # ensure file ends with newline before appending
  if [ -s "$SCHEMA_FILE" ] && [ "$(tail -c 1 "$SCHEMA_FILE")" != "" ]; then
    printf '\n' >> "$SCHEMA_FILE"
  fi
  echo "$SCHEMA_LINE" >> "$SCHEMA_FILE"
  echo "✅ Wired schema in $SCHEMA_FILE"
fi

APP_MODULE="src/app.module.ts"
IMPORT_LINE="import { ${PASCAL_PLURAL}Module } from '@modules/${PLURAL}/${PLURAL}.module';"

# Runs an awk transform and aborts if it did not actually change the file, so a
# format change in app.module.ts can never leave us with a false "✅ Wired".
apply_or_die() {
  local file="$1" desc="$2" script="$3" var_name="$4" var_val="$5"
  awk -v "$var_name=$var_val" "$script" "$file" > "$file.tmp"
  if cmp -s "$file" "$file.tmp"; then
    rm -f "$file.tmp"
    echo "❌ Auto-wiring failed: could not $desc in $file."
    echo "   Add it manually and re-run with the module already present."
    exit 1
  fi
  mv "$file.tmp" "$file"
}

if ! grep -qF "$IMPORT_LINE" "$APP_MODULE" 2>/dev/null; then
  # add import after the last existing @modules import
  apply_or_die "$APP_MODULE" "insert the module import" '
    /^import .* from .@modules\// { last=NR; lines[NR]=$0; next }
    { lines[NR]=$0 }
    END {
      for (i=1; i<=NR; i++) {
        print lines[i]
        if (i == last) print imp
      }
    }
  ' imp "$IMPORT_LINE"

  # add module to imports array (after the last @modules module already there)
  apply_or_die "$APP_MODULE" "register the module in the imports array" '
    /Module,$/ && /^    / { last=NR }
    { lines[NR]=$0 }
    END {
      for (i=1; i<=NR; i++) {
        print lines[i]
        if (i == last) print mod
      }
    }
  ' mod "    ${PASCAL_PLURAL}Module,"

  echo "✅ Wired ${PASCAL_PLURAL}Module in $APP_MODULE"
fi

echo ""
echo "🎉 Module '${PLURAL}' created."
echo ""
echo "Next steps:"
echo "  1. Review src/app.module.ts and $SCHEMA_FILE (auto-wired — sanity-check)"
echo "  2. Adjust the entity, schema, and DTOs for your real fields"
echo "  3. pnpm db:push   # apply the new table"
echo "  4. pnpm start:dev"