import { getRemoteConfig } from './remoteConfig';
import { getSupabaseServerClient } from './supabase';

const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // ElevenLabs 기본 보이스("Adam") — 공학쇼츠 프로젝트에서도 쓴 값

// ElevenLabs TTS로 컷 텍스트를 음성으로 합성하고, 결과 mp3를 Supabase Storage(cutdaeri-assets 버킷)에
// 올려서 공개 URL을 반환한다. fal.ai도 TTS를 지원하지만, ElevenLabs 무료 티어(월 10,000자)로
// 테스트하기엔 충분해서 직접 호출하는 쪽을 택했다(공학쇼츠 프로젝트와 동일 판단).
export async function generateCutVoice(cutId: string, text: string): Promise<{ audioUrl: string }> {
  const apiKey = await getRemoteConfig('ELEVENLABS_API_KEY');
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY가 설정되어 있지 않습니다.');

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
  });
  if (!res.ok) throw new Error(`TTS 생성 실패 (${res.status}): ${(await res.text()).slice(0, 300)}`);

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  const supabase = getSupabaseServerClient();
  const path = `${cutId}-${Date.now()}.mp3`;
  const { error: uploadError } = await supabase.storage.from('cutdaeri-assets').upload(path, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from('cutdaeri-assets').getPublicUrl(path);
  return { audioUrl: data.publicUrl };
}
