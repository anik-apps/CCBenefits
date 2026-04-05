import { QueryClient } from '@tanstack/react-query';
import { refreshAllCardData } from '../queryHelpers';

describe('refreshAllCardData', () => {
  it('invalidates all three card query keys', async () => {
    const queryClient = new QueryClient();
    const spy = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    await refreshAllCardData(queryClient);

    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['all-card-details'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['user-cards'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['user-card'] });
  });

  it('calls invalidations sequentially (awaits each)', async () => {
    const order: string[] = [];
    const queryClient = new QueryClient();
    jest.spyOn(queryClient, 'invalidateQueries').mockImplementation(async (opts: any) => {
      order.push(opts.queryKey[0]);
    });

    await refreshAllCardData(queryClient);

    expect(order).toEqual(['all-card-details', 'user-cards', 'user-card']);
  });
});
