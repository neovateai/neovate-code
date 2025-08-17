import { createFileRoute } from '@tanstack/react-router';
import HomePage from '@/components/HomePage';

export const Route = createFileRoute('/homepage')({
  component: HomePage,
});
