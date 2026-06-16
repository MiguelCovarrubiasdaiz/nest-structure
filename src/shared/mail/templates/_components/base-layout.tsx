import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto my-10 max-w-[560px] rounded-lg bg-white p-8">
            <Section>{children}</Section>
            <Hr className="my-6 border-gray-200" />
            <Text className="text-xs text-gray-400">
              Sent by Nest Hexagonal Boilerplate
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}