import { Button, Heading, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './_components/base-layout';

export interface WelcomeEmailProps {
  name: string;
  ctaUrl: string;
}

export function WelcomeEmail({ name, ctaUrl }: WelcomeEmailProps) {
  return (
    <BaseLayout preview={`Welcome to the app, ${name}!`}>
      <Heading className="text-2xl font-bold text-gray-900">
        Welcome, {name} 👋
      </Heading>
      <Text className="text-base text-gray-700">
        Thanks for joining! Your account is ready. Click the button below to get
        started.
      </Text>
      <Button
        href={ctaUrl}
        className="rounded-md bg-black px-5 py-3 text-center text-sm font-medium text-white"
      >
        Open the app
      </Button>
    </BaseLayout>
  );
}

// react-email CLI usa el default export como preview por defecto
WelcomeEmail.PreviewProps = {
  name: 'Jane',
  ctaUrl: 'https://example.com',
} satisfies WelcomeEmailProps;

export default WelcomeEmail;