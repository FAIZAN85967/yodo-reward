import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CoinPackage } from '@/lib/types';

export function useCoinPackages() {
  const [packages, setPackages] = useState<CoinPackage[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: loadError } = await supabase
        .from('coin_packages')
        .select('id, rupees, coins, is_active')
        .order('rupees', { ascending: true });
      if (!active) return;
      if (loadError) {
        setError(true);
        return;
      }
      setError(false);
      setPackages((data ?? []) as CoinPackage[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { packages, error };
}
