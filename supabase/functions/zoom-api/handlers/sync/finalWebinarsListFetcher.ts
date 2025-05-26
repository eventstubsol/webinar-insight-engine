
// Gets the final list of webinars to return to the client
export async function getFinalWebinarsList(supabase: any, userId: string) {
  const { data: allDbWebinars, error: allDbError } = await supabase
    .from('zoom_webinars')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });
  
  return allDbWebinars?.map(w => ({
    id: w.webinar_id,
    uuid: w.webinar_uuid,
    topic: w.topic,
    start_time: w.start_time,
    duration: w.duration,
    timezone: w.timezone,
    agenda: w.agenda || '',
    host_email: w.host_email,
    host_id: w.host_id,
    status: w.status,
    type: w.type,
    ...w.raw_data
  })) || [];
}
