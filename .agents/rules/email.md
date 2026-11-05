---
paths:
  - 'src/shared/mail/**'
  - 'src/**/*.email.tsx'
---

# Email

A shared hexagonal kernel in `src/shared/mail/`, not a feature module.

## The port is technology-neutral

`MailService.send(input)` (`ports/mail.service.ts`), token `MAIL_SERVICE`. The
caller describes **which** template and **what data** — never a React element
or raw HTML:

```ts
await this.mail.send({
  to: user.email,
  subject: 'Welcome!',
  template: { id: 'welcome', data: { name: user.name, ctaUrl } },
});
```

`MailTemplate` is a discriminated union, so `data` is type-checked against the
template `id`.

## Rendering

React Email lives only in infrastructure: `templates/*.email.tsx` +
`renderMailTemplate` (`templates/render-template.ts`), called by the adapters
to produce HTML + plain text. Templates wrap content in
`_components/base-layout.tsx`.

## Adding a template

1. Create `templates/<name>.email.tsx` using `BaseLayout` and
   `@react-email/components`; add `PreviewProps` and a `default` export so it
   shows in `pnpm email:dev` (:3001).
2. Add a `<Name>MailData` interface and a `{ id: '<name>'; data: … }` member to
   the `MailTemplate` union in `ports/mail.service.ts`.
3. Add the `case '<name>'` in `selectElement` in `render-template.ts` (the
   `never` check fails to compile until you do).
4. Send it from a use-case.

## Sending from a use-case

Mail is **best-effort**: a failed send must not break the main operation.
Wrap it in `try/catch` and `logger.warn` (see `CreateUserUseCase`).

## Adapters (`MAIL_DRIVER`)

- `log` (dev): renders and prints the plain-text version, sends nothing.
- `smtp`: Nodemailer with `MAIL_SMTP_*`.

A new provider (Resend, SES…) = a class implementing `MailService` that calls
`renderMailTemplate`, + a `case` in `mail.module.ts` + its env vars.
