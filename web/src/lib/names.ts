// "정이현"처럼 성이 붙은 이름도 "이현"으로 적힌 샷·소재·미정 항목과 이어지도록, 전체 이름 또는 뒤 두 글자(이름)로 맞춘다.
export function mentions(text: string | undefined | null, name: string) {
  if (!text || !name) return false;
  if (text.includes(name)) return true;
  const given = name.length >= 3 ? name.slice(-2) : "";
  return given.length === 2 && text.includes(given);
}
