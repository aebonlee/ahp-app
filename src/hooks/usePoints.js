import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

// 포인트 잔액 조회
export function usePointBalance() {
  const { profile, refreshProfile } = useAuth();
  return {
    balance: profile?.points_balance ?? 0,
    refresh: refreshProfile,
  };
}

// 포인트 내역 조회
export function usePointHistory(pageSize = 20) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistory = useCallback(async (offset = 0) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('ahp_get_point_history', {
      p_limit: pageSize + 1,
      p_offset: offset,
    });
    if (error) {
      setHistory([]);
      setHasMore(false);
    } else {
      const items = data || [];
      setHasMore(items.length > pageSize);
      setHistory(items.slice(0, pageSize));
    }
    setLoading(false);
  }, [pageSize]);

  useEffect(() => {
    fetchHistory(page * pageSize);
  }, [fetchHistory, page, pageSize]);

  return { history, loading, page, setPage, hasMore, refresh: () => fetchHistory(page * pageSize) };
}

// 마켓플레이스 프로젝트
export function useMarketplace() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('ahp_get_marketplace_projects');
    if (error) {
      setProjects([]);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const joinProject = useCallback(async (projectId) => {
    setJoining(projectId);
    const { data, error } = await supabase.rpc('ahp_join_marketplace_project', {
      p_project_id: projectId,
    });
    setJoining(null);
    if (error) throw error;
    await fetchProjects();
    return data;
  }, [fetchProjects]);

  return { projects, loading, joinProject, joining, refresh: fetchProjects };
}

// 출금 요청 관리
export function useWithdrawals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ahp_withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setRequests([]);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const requestWithdrawal = useCallback(async (amount, bank, account, holder) => {
    const { data, error } = await supabase.rpc('ahp_request_withdrawal', {
      p_amount: amount,
      p_bank: bank,
      p_account: account,
      p_holder: holder,
    });
    if (error) throw error;
    await fetchRequests();
    return data;
  }, [fetchRequests]);

  return { requests, loading, requestWithdrawal, refresh: fetchRequests };
}
