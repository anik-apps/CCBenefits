import type { QueryClient } from '@tanstack/react-query';

export async function refreshAllCardData(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: ['all-card-details'] });
  await queryClient.invalidateQueries({ queryKey: ['user-cards'] });
  await queryClient.invalidateQueries({ queryKey: ['user-card'] });
}
