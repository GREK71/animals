import CharacterForm from "../CharacterForm";

export default function NewCharacter() {
  return (
    <>
      <div className="view-title"><h1>캐릭터</h1><span className="id">C-03</span><span className="crumb">캐릭터 › 새 캐릭터</span></div>
      <section className="card"><div className="pane">
        <p className="muted small" style={{ marginBottom: 14 }}>설정만 먼저 넣고, 레퍼런스 이미지와 고정 프롬프트는 만든 뒤 비주얼 가이드 탭에서 올립니다.</p>
        <CharacterForm id="new" />
      </div></section>
    </>
  );
}
