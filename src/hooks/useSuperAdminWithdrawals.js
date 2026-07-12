import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useSuperAdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.rpc('ahp_sa_list_withdrawals');
      if (fetchError) {
        setError(fetchError.message);
        setWithdrawals([]);
      } else {
        setWithdrawals(data || []);
      }
    } catch (err) {
      setError(err.message || '출금 목록 조회 실패');
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const processWithdrawal = useCallback(async (requestId, action, note = null) => {
    const { error } = await supabase.rpc('ahp_sa_process_withdrawal', {
      p_request_id: requestId,
      p_action: action,
      p_note: note,
    });
    if (error) throw error;
    await fetchWithdrawals();
  }, [fetchWithdrawals]);

  return { withdrawals, loading, error, processWithdrawal, refresh: fetchWithdrawals };
}
