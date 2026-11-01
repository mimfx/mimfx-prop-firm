import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
  "https://jklmzkmankwnrlcgbtsa.supabase.co",
  "sb_publishable_mKFp98jH1Lt2HcxwHOEkLw_H9Fgksqz",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
