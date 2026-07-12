import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

function getVisitorId() {
  const key = 'ahp_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function usePageView() {
  const { pathname } = useLocation();
  const prevPath = useRef(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (pathname === prevPath.current || pendingRef.current) return;
    prevPath.current = pathname;
    pendingRef.current = true;

    const visitorId = getVisitorId();

    const record = (uid) => {
      supabase
        .rpc('ahp_record_page_view', {
          p_path: pathname,
          p_visitor_id: visitorId,
          p_user_id: uid || null,
        })
        .then(null, () => {})
        .finally(() => { pendingRef.current = false; });
    };

    supabase.auth.getUser()
      .then(({ data }) => record(data?.user?.id))
      .catch(() => record(null));
  }, [pathname]);
}
