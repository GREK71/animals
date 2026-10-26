import type Database from "better-sqlite3";
import type { Asset, Character, Episode, Issue, Place, PromptVersion, RelationChange, Run, Shot, Variant } from "./types";

const HYUN_PROMPT = `이현은 31세 한국인 남성으로, 키 185cm의 키 크고 슬림한 체형이다. 첨부한 원본 얼굴 이미지를 얼굴 정체성의 최우선 기준으로 사용하고, 캐릭터 시트는 체형과 의상 참고용으로 사용한다.

얼굴 레퍼런스의 얼굴형, 눈매, 코, 입술, 턱선, 헤어스타일, 피부색과 자연스러운 피부 결을 유지한다. 모든 프레임에서 동일 인물로 보여야 한다. 젊고 세련된 인상이며 실제 사람처럼 자연스러운 개성이 있다. 전형적인 아이돌/AI 미남처럼 완벽하게 대칭적이거나 과도하게 보정된 얼굴로 만들지 않는다. 피부에는 자연스러운 모공과 잔결, 옅은 눈 밑 그늘이 보인다.

도베르만 수인의 인상은 외형 표식이 아니라 주변을 살피는 집중된 시선, 절제된 표정, 곧고 통제된 자세와 조용한 권위에서 드러난다. 차분하고 경계심이 있지만 화나 있거나 위협적으로 보이지 않는다.

체형은 길고 날렵하며 어깨와 상체가 넓거나 근육질로 부풀어 보이지 않는다. 기본 의상은 단정한 검정색 니트와 어두운색 바지 같은 깔끔한 캐주얼 차림이다.

이현은 인간형이며 완전히 인간처럼 보인다. 동물 귀, 꼬리, 털, 주둥이 등 눈에 띄는 동물 특징은 없다. 실사 영상처럼 현실적인 피부와 자연스러운 움직임, 조명을 사용한다.`;

const YOON_PROMPT = `서도윤은 28세 한국인 남성으로, 키 187cm의 모델 체형이다. 첨부한 도윤 얼굴 이미지를 얼굴 정체성의 최우선 기준으로 사용한다. 모든 프레임에서 동일 인물로 보여야 한다.

얼굴 레퍼런스의 쌍꺼풀이 거의 없는 무쌍 눈, 약간 큰 코, 두껍지 않은 입술, 자연스럽게 헝클어진 짙은 머리, 피부색과 자연스러운 피부 결을 유지한다. 20대 후반에서 30대 초반으로 보이는 인상이다. 실제 사람처럼 자연스러운 개성과 미세한 비대칭이 있으며, 과도하게 보정된 아이돌/AI 미남상으로 만들지 않는다. 눈을 크게 만들거나 쌍꺼풀을 추가하지 않는다.

레퍼런스 이미지의 표정이 차분해도 얼굴 생김새만 유지하고 표정은 아래 지시를 따른다. 골든 리트리버 수인의 인상은 외형 표식이 아니라 열려 있는 자세, 사람을 향해 몸이 먼저 기우는 반응, 감정이 얼굴에 바로 드러나는 솔직한 표정에서 드러난다. 기분이 좋으면 눈이 가늘어지며 온 얼굴이 환해지고, 멈칫할 때는 아차 하는 표정이 숨겨지지 않는다. 웃으면 평소보다 인상이 확실히 부드러워진다.

체형은 키 크고 균형 잡힌 모델 체형으로, 이현보다 어깨가 조금 더 넓지만 과하게 근육질은 아니다. 기본 의상은 밝은 색(크림, 베이지, 연회색) 후드티나 맨투맨에 편한 바지 같은 현실적인 홈웨어 차림으로, 검정 니트의 이현과 화면에서 대비된다.

서도윤은 인간형이며 완전히 인간처럼 보인다. 동물 귀, 꼬리, 털, 주둥이 등 눈에 띄는 동물 특징은 없다. 실사 영상처럼 현실적인 피부와 자연스러운 움직임, 조명을 사용한다.`;

const characters: Record<string, Character> = {
  hyun: {
    name: "이현", age: 31, sex: "남", height: "185cm", species: "도베르만 수인", role: "주인공",
    residence: "수인 쉐어하우스 (집주인)", job: "수인 모델 에이전시 팀장 또는 사장",
    intro: "인간 사회에 완벽히 적응한 도베르만 수인. 겉은 차갑고 무심하지만 정이 많고, 사랑에 쉽게 빠지는 금사빠.",
    background: ["개의 본능과 습성을 잘 억제한다. 수인이라고 말하지 않으면 알아보기 어렵다.", "연애가 오래 가지 못하고 차이는 일이 잦다. 차인 날은 유독 예민하고 까칠해진다.", "도윤의 과거를 아는 유일한 사람. 본능이 튀어나오는 도윤을 제어하고 가르치는 보호자 역할."],
    keywords: ["어른스러움", "도시적", "무심한 듯 정 많음", "감정 표현 적음", "금사빠", "차인 날 까칠"],
    honorifics: [{ to: "서도윤", call: "\"도윤아\" / \"서도윤\"", called: "\"현이형\"", tone: "서로 반말" }],
    habits: ["음식 냄새에 무심코 반응", "애착 베개 (냄새)", "자리 고르기", "소리에 눈만 돌림", "차인 날 예민"],
    forbidden: ["화나거나 위협적인 표정으로 도베르만을 표현하지 않는다.", "본능이 새는 순간은 아주 가끔, 작은 동작으로만."],
    appearance: ["젊고 세련된 미형. 자연스러운 모공과 잔결, 옅은 눈 밑 그늘. 도자기처럼 보정하지 않는다.", "도베르만의 인상은 집중된 시선, 경계심, 통제된 자세에서. 위협적이거나 화난 표정으로 과장하지 않는다.", "키 크고 슬림한 실루엣. 기본 의상은 검정 니트와 어두운색 바지.", "동물 귀, 꼬리, 털, 주둥이 등 눈에 띄는 동물 특징 없음."],
    refPriority: ["얼굴 앵커: 얼굴 정체성, 표정 방향, 피부, 헤어", "캐릭터 시트: 전신 비율, 슬림한 체형, 의상, 옆모습", "장면 지시: 장소·동작·카메라·조명만. 외형 기준을 덮어쓰지 않는다"],
    ready: { face: true, sheet: true, soul: false, animal: false }, promptVersion: "v1", initial: "현", color: "#2e3236",
    soul: { status: "미학습", setCount: 0, model: "Soul 2.0 (예정)", hfId: "—" },
    slots: [
      { role: "얼굴 앵커", file: "정이현_외모-얼굴.png", status: "승인 · AI 생성 · 유사성 검토 완료" },
      { role: "캐릭터 시트", file: "정이현_외모-체형.png", status: "승인 · AI 생성" },
      { role: "Soul ID 학습 세트", file: "다각도 스틸 20~80장", status: "미학습", empty: true, note: "0 / 20" },
      { role: "동물형 앵커", file: "도베르만 레퍼런스", status: "미등록", empty: true },
    ],
    relations: [{ to: "yoon", types: ["형·동생", "집주인→입주자", "대표·팀장→소속 모델", "보호자"], current: "잔소리하는 쪽 · 산책을 챙기는 쪽" }],
  },
  yoon: {
    name: "서도윤", age: 28, sex: "남", height: "187cm", species: "골든 리트리버 수인", role: "주인공",
    residence: "수인 쉐어하우스 (입주자)", job: "수인 모델 에이전시 소속 모델",
    intro: "주인에게 버려져 떠돌다 인간화 능력이 발현한 골든 리트리버 수인. 매사에 긍정적이고 해맑으며 사람을 잘 따른다.",
    background: ["인간화는 잘하지만 아직 완전히 적응하지 못했고, 개의 습성이 간간이 튀어나온다.", "장난기가 있지만 명령은 잘 듣는 편.", "모델 일을 할 때는 일상과 달리 카리스마 있고 멋진 모습을 보여준다."],
    keywords: ["긍정적", "해맑음", "사람을 잘 따름", "장난기", "명령 잘 들음"],
    honorifics: [{ to: "이현", call: "\"현이형\"", called: "\"도윤아\" / \"서도윤\"", tone: "서로 반말" }],
    habits: ["현관문 소리에 먼저 반응", "냄새 먼저 확인", "좋아하는 사람 따라다니기", "칭찬에 금방 밝아짐", "쓰다듬으면 눈 감음"],
    forbidden: ["눈을 크게 만들거나 쌍꺼풀을 추가하지 않는다.", "이전 가이드의 무표정·경계심 인상을 기본값으로 쓰지 않는다."],
    appearance: ["쌍꺼풀이 거의 없는 무쌍 눈, 약간 큰 코, 두껍지 않은 입술, 헝클어진 짙은 머리.", "얼굴 생김새는 유지하고 표정 기본값만 밝은 방향으로.", "밝은 색 후드티·맨투맨 홈웨어로 검정 니트의 이현과 대비."],
    refPriority: ["얼굴 앵커 (추가 필요)", "캐릭터 시트 (추가 필요)", "장면 지시"],
    ready: { face: false, sheet: false, soul: false, animal: false }, promptVersion: "v1", initial: "윤", color: "#c99a4b",
    soul: { status: "미학습", setCount: 0, model: "—", hfId: "—" },
    slots: [
      { role: "얼굴 앵커", file: "visual/서도윤-얼굴.png 등록 필요", status: "미등록", empty: true },
      { role: "캐릭터 시트", file: "visual/캐릭터시트-서도윤.jpg 등록 필요", status: "미등록", empty: true },
      { role: "Soul ID 학습 세트", file: "다각도 스틸 20~80장", status: "미학습", empty: true, note: "0 / 20" },
      { role: "리트리버형 앵커", file: "EP.02용", status: "미등록", empty: true },
    ],
    relations: [{ to: "hyun", types: ["형·동생", "입주자", "소속 모델", "피보호자"], current: "잔소리 듣는 쪽" }],
  },
};

const places: Record<string, Place> = {
  living: { name: "쉐어하우스 거실", group: "쉐어하우스", note: "저녁 · 전구색 기본", anchor: true, promptVersion: "v1", short: "거실", fixed: ["회색 패브릭 소파", "복도로 이어지는 입구", "전구색 조명"], variable: ["쿠션·담요 색", "테이블 위 소품"] },
  entry: { name: "쉐어하우스 현관", group: "쉐어하우스", note: "저녁 · 현관등", anchor: true, promptVersion: "v1", short: "현관", fixed: ["현관문", "신발장", "짧은 복도"], variable: ["신발 개수", "택배 상자"] },
  laundry: { name: "세탁실", group: "쉐어하우스", note: "EP.03 예정", anchor: false, promptVersion: "—", short: "세탁", fixed: ["드럼 세탁기"], variable: [] },
  walk: { name: "아파트 산책로", group: "실외", note: "밤 · 가로등", anchor: false, promptVersion: "—", short: "산책", fixed: ["가로등", "가로수"], variable: ["계절"] },
};

const episodes: Record<string, Episode> = {
  ep01: {
    no: "EP.01", title: "현관문 소리", status: "prod", hook: "우리 집 룸메는 현관문 소리에 반응한다",
    summary: "도윤이 소파에서 폰을 보다 도어락 소리에 고개가 홱 돌아가고, 벌떡 일어나 현관 앞에서 기다린다. 들어온 이현은 놀라지 않고 \"…앉아.\" 도윤은 순순히 돌아가 앉는다. 이현이 치킨을 꺼낼 때 코를 들이미는 도윤의 얼굴을 보지도 않고 밀어낸다. \"냄새 맡지 마.\"",
    characters: ["yoon", "hyun"], places: ["living", "entry"], lighting: "저녁 · 전구색 실내",
    habits: ["현관문 소리에 먼저 반응", "좋아하는 사람 따라다니기", "냄새 먼저 확인", "명령 잘 듣기"], series: "소리 반응", length: "약 18초 · 9:16",
    continuity: [{ text: "의상: 이현 검정 니트 · 도윤 크림 후드티", done: true }, { text: "조명: 전구색 실내, 같은 저녁", done: true }, { text: "소품: 종이 쇼핑백, 치킨 상자, 회색 패브릭 소파", done: true }, { text: "샷 3a→3b 연결: 이현 시선 방향과 도윤 위치 일치", done: false }],
    relationNote: "기준점 설정",
    compose: {
      shot: "3b \"앉아\" 리버스",
      blocks: [
        { n: "1", title: "캐릭터 · 서도윤", version: "고정 프롬프트 v1 (현재)", preview: "서도윤은 28세 한국인 남성으로, 키 187cm의 모델 체형이다. 첨부한 도윤 얼굴 이미지를 얼굴 정체성의 최우선 기준으로 사용한다. 얼굴 레퍼런스의 쌍꺼풀이 거의 없는 무쌍 눈, 약간 큰 코, 두껍지 않은 입술, 자연스럽게 헝클어진 짙은 머리를 유지한다…" },
        { n: "2", title: "장소 · 쉐어하우스 현관", version: "공통 프롬프트 v1 (현재)", preview: "저녁, 쉐어하우스 현관 안쪽. 현관 조명이 켜져 있다. 거실 쪽으로 이어지는 짧은 복도. 신발장과 현관문이 프레임 안에 들어온다…" },
        { n: "3", title: "샷 지시", version: "샷 테이블에서 자동 채움", preview: "행동: 환한 얼굴로 문 쪽을 바라보던 도윤이 한 마디를 들은 듯 잠시 멈춘다. 표정이 살짝 시무룩해지지만 바로 몸을 돌려 소파로 돌아가 앉는다.\n감정과 반응: 서운함 반, 기대감 반. 앉은 뒤에도 발끝이 바닥을 톡톡.\n카메라: 가슴 위 MCU에서 시작해 앉는 동작을 따라 살짝 후퇴 / 세로 9:16 / 5초" },
        { n: "4", title: "공통 규격 · 스타일 프리셋", version: "v1 (현재)", preview: "세로 9:16. 실사 영상처럼 현실적인 피부와 자연스러운 움직임, 조명. 동작은 과장하지 않는다. 얼굴·체형·헤어·의상은 장면 전체에서 일관. 화면 안에 글자·자막·로고를 생성하지 않는다. 첨부 이미지의 구도·배경을 복제하지 않는다." },
      ],
      refs: [{ order: "ID", status: "bad", label: "서도윤 Soul ID", note: "학습 세트 0장 · 미정 항목으로 연결됨" }, { order: "1", status: "ok", label: "쉐어하우스 현관 앵커", note: "장소_현관_앵커.png · 무드보드로 첨부" }],
      keyframe: "[Soul ID: Seo Doyoon] A 28-year-old Korean man, 187cm, tall model build, cream hoodie, monolid eyes with no double eyelid, slightly large nose, thin lips, naturally messy dark hair. Standing at the hallway entrance of a small apartment at night, warm entry light, short hallway behind him leading to a living room with a grey sofa. He faces the front door with a beaming, open expression, body leaning slightly forward, caught the instant before hearing a short command. Medium close-up from the chest up, slightly low angle. Vertical 9:16, photoreal, realistic skin with visible pores, natural tungsten interior light, smartphone-realistic contrast. No text, captions or logos in frame.",
      motion: "He pauses as if hearing one short word. His smile dips into a brief sulk, then he turns and walks back toward the grey sofa and sits down, head still turned toward the door; his foot taps the floor lightly. Camera holds, then eases back slightly as he sits. 5 seconds, natural understated motion, keep face, hair and outfit identical to the start frame.",
      warning: "서도윤 Soul ID가 없어 키프레임 스냅샷은 \"정체성 미확정\"으로 표시됩니다. Soul ID 학습 후 새 시도를 권장합니다.",
    },
    publish: {
      checklist: [{ text: "AI 생성 범위", done: true, right: "전체 AI 생성" }, { text: "사용 생성 도구 기록", done: true, right: "힉스필드 · Soul 2.0 / Kling 3.0 / Veo 3.1" }, { text: "캡션에 AI 생성 표기", done: false, right: "미작성" }, { text: "플랫폼 AI 라벨 적용", done: false, right: "게시 시 확인" }, { text: "광고 · 협찬 없음", done: true, right: "해당 없음" }, { text: "음성 · 음원 합성 여부", done: false, right: "효과음만 · 확인 필요" }, { text: "연결 소재 권리 확인", done: false, right: "미확인 1건 (도윤 제안 프롬프트 생성물)", bad: true }],
      rows: [{ platform: "인스타그램 릴스", status: "예정" }, { platform: "유튜브 쇼츠", status: "예정" }],
      caption: "입주자 서도윤(28), 집주인 이현(31). 평범한 쉐어하우스입니다. 아마도. #AI생성 #수인쉐어하우스",
    },
    series_list: [{ no: "01", title: "현관문 소리 (도어락)", active: true }, { no: "—", title: "택배 벨" }, { no: "—", title: "배달 오토바이" }],
  },
  ep02: { no: "EP.02", title: "그 날", status: "plan", hook: "룸메가 가끔 개가 된다 (진짜로)", summary: "이현이 빈 집에서 \"서도윤\" 하고 부르면 침대 위에 후드티를 깔고 자는 골든 리트리버가 꼬리만 두 번 친다. \"…오늘이야?\" 리드줄을 꺼내 밤 산책.", characters: ["hyun", "yoon"], places: ["living", "walk"], lighting: "저녁 실내 · 밤 가로등", habits: ["동물형", "산책 냄새 맡기"], series: "", length: "약 20초 · 9:16", continuity: [], relationNote: "" },
  ep03: { no: "EP.03", title: "세탁기 속 애착 베개", status: "idea", hook: "집주인이 세탁기 앞에서 30분째 안 움직인다", summary: "도윤이 이현의 애착 베개를 빨아버린다. 이현은 세탁기 앞에 쪼그려 앉아 돌아가는 베개를 바라본다. \"…냄새.\" \"응?\" \"아니야.\"", characters: ["hyun", "yoon"], places: ["laundry"], lighting: "형광등 · 세탁기 불빛", habits: ["냄새 애착"], series: "", length: "약 15초 · 9:16", continuity: [], relationNote: "" },
  ep04: { no: "EP.04", title: "촬영장의 장난감", status: "idea", hook: "모델 촬영이 안 풀릴 때 팀장이 꺼내는 비밀 무기", summary: "스튜디오 배경 준비 후.", characters: ["yoon", "hyun"], places: [], lighting: "", habits: ["장난감"], series: "", length: "", continuity: [], relationNote: "" },
};

const shots: Record<string, Shot> = {
  s1: { episodeId: "ep01", no: "1", title: "소리에 반응", who: "도윤", place: "거실", length: "5s", camera: "MCU 고정", subtitle: "0.0s \"우리 집 룸메는…\" / 1.5s \"띠리릭\"", status: "done", candidates: 3 },
  s2: { episodeId: "ep01", no: "2", title: "벌떡 일어나 현관으로", who: "도윤", place: "거실→현관", length: "5s", camera: "와이드 고정", subtitle: "", status: "cand", candidates: 2 },
  s3a: { episodeId: "ep01", no: "3a", title: "이현 등장", who: "이현", place: "현관", length: "5s", camera: "MS 로우", subtitle: "", status: "cand", candidates: 2 },
  s3b: { episodeId: "ep01", no: "3b", title: "\"앉아\" 리버스", who: "도윤", place: "현관", length: "5s", camera: "MCU → 후퇴", subtitle: "10s \"…앉아.\"", status: "none", candidates: 0 },
  s4: { episodeId: "ep01", no: "4", title: "냄새 맡지 마", who: "이현 + 도윤", place: "주방", length: "5s", camera: "MS 고정", subtitle: "16s \"냄새 맡지 마.\"", status: "none", candidates: 0 },
};

const runs: Record<string, Run> = {
  r1: { shotId: "s1", n: 1, stage: "키프레임", model: "힉스필드 Soul 2.0", at: "10.27 13:05", note: "후보 3 · 전부 폐기 (얼굴 불일치, Soul ID 없음)" },
  r2: { shotId: "s1", n: 2, stage: "키프레임", model: "힉스필드 Soul 2.0", at: "10.27 13:40", note: "도윤 v1 + 거실 v1 + 스타일 v1 · 후보 4 · v2 확정(시작 프레임)" },
  r3: { shotId: "s1", n: 3, stage: "영상", model: "힉스필드 Kling 3.0", at: "2026.10.27 14:20", note: "시작 프레임 = 시도 2 키프레임 v2 · 모션 프롬프트 + 프리셋 \"static\" · 시드 48213" },
  r4: { shotId: "s2", n: 2, stage: "영상", model: "힉스필드 Kling 3.0", at: "10.27 15:02", note: "시작 프레임 = 시도 1 키프레임 v1 · 프리셋 \"static wide\"" },
  r5: { shotId: "s3a", n: 2, stage: "영상", model: "힉스필드 Veo 3.1", at: "10.27 15:40", note: "시작 프레임 = 시도 1 키프레임 v3 (이현 v1 + 현관 v1, 얼굴 앵커·시트 첨부) · 프리셋 \"low angle static\"" },
  r6: { shotId: "s4", n: 0, stage: "키프레임", model: "힉스필드 Soul 2.0", at: "—", note: "입력 준비 (스냅샷 저장됨, 실행 전)" },
};

const variants: Record<string, Variant> = {
  v1: { runId: "r3", label: "v1", note: "시선이 늦게 움직임", state: "drop" },
  v2: { runId: "r3", label: "v2", note: "얼굴 흔들림", state: "drop" },
  v3: { runId: "r3", label: "v3", note: "표정 변화 자연스러움", state: "pick" },
  v4: { runId: "r4", label: "v1", note: "걸음 자연스러움, 뒷모습", state: "cand" },
  v5: { runId: "r4", label: "v2", note: "폰 던지는 동작 어색", state: "cand" },
  v6: { runId: "r5", label: "v1", note: "고개 까딱 좋음", state: "cand" },
  v7: { runId: "r5", label: "v2", note: "쇼핑백 형태 흐림", state: "cand" },
};

const assets: Record<string, Asset> = {
  a1: { name: "정이현_외모-얼굴.png", kind: "이미지", role: "얼굴 앵커 · 이현", status: "승인", at: "2026.10.26", by: "운영자", note: "", size: "1024×1365 · 1.2MB", hash: "sha256 …3f9a", source: "AI 생성", tool: "ChatGPT 이미지 · 2026.09", license: "도구 약관에 따른 상업 이용 가능", portrait: "해당 없음 (실존 인물 아님)", derive: "허용", similarity: "2026.10.26 역이미지 검색 3종으로 확인. 특정 실존 인물과 뚜렷한 유사성 없음. 승인.", links: ["이현", "EP.01 샷 3a · 시도 1", "EP.01 샷 4 · 시도 0"], lineage: [{ v: "원본", text: "이 파일 · ChatGPT 이미지 생성 결과", at: "2026.09.29" }, { v: "파생", text: "정이현_외모-체형.png · 이 파일을 얼굴 기준으로 생성한 캐릭터 시트", at: "2026.10.20" }], refs: [{ v: "앵커", text: "이현 · 얼굴 앵커 슬롯", at: "" }, { v: "run", text: "EP.01 샷 3a · 생성 시도 1 · 첨부 순서 1", at: "10.27" }, { v: "run", text: "EP.01 샷 4 · 생성 시도 0 · 첨부 순서 1", at: "—" }] },
  a2: { name: "정이현_외모-체형.png", kind: "이미지", role: "캐릭터 시트 · 이현", status: "승인", at: "2026.10.26", by: "운영자", note: "", size: "1024×1536 · 2.1MB", source: "AI 생성", tool: "ChatGPT 이미지", license: "도구 약관에 따른 상업 이용 가능", portrait: "해당 없음", derive: "허용", similarity: "얼굴 앵커 기준 파생. 별도 검토 불필요.", links: ["이현"], lineage: [{ v: "원본", text: "정이현_외모-얼굴.png", at: "2026.09.29" }], refs: [{ v: "앵커", text: "이현 · 캐릭터 시트 슬롯", at: "" }] },
  a3: { name: "EP01_S01_run2_v3.mp4", kind: "영상", role: "확정 후보 · EP.01 샷 1", status: "권리 미확인", at: "2026.10.27", by: "운영자", note: "도윤 얼굴 앵커 없이 생성 · 유사성 검토 필요", source: "AI 생성", tool: "힉스필드 Kling 3.0", license: "확인 필요", portrait: "확인 필요", derive: "허용", similarity: "", links: ["EP.01 샷 1 · 시도 3"], lineage: [{ v: "원본", text: "시도 2 키프레임 v2에서 영상 생성", at: "2026.10.27" }], refs: [{ v: "variant", text: "EP.01 샷 1 · 시도 3 · v3 (확정)", at: "10.27" }] },
  a4: { name: "screen-plan.md", kind: "설정집", role: "", status: "—", at: "2026.10.27", by: "운영자", note: "", source: "직접 제작", license: "—", portrait: "해당 없음", derive: "허용", similarity: "", links: [] },
};

const issues: Record<string, Issue> = {
  i1: { scope: "캐릭터 · 서도윤", title: "얼굴 · 리트리버형 레퍼런스", desc: "이전 기획 프로필 2종·시트를 visual/에 추가", options: "—", blocks: "EP.01, EP.02", status: "open" },
  i2: { scope: "채널", title: "영상 질감 방향", desc: "두 인물에 같은 톤 적용. 스타일 프리셋에 반영", options: "스마트폰 브이로그 / 웹드라마", blocks: "EP.01", status: "open" },
  i3: { scope: "캐릭터 · 이현", title: "에이전시 직함", desc: "", options: "팀장 / 사장", blocks: "—", status: "warn" },
  i4: { scope: "세계관", title: "동물형 전환 방식", desc: "고정 주기를 둘지, 에피소드마다 다르게 둘지", options: "고정 주기 / 상황별", blocks: "EP.02", status: "warn" },
  i5: { scope: "세계관", title: "세 번째 입주자", desc: "", options: "고양이 / 햄스터 / 토끼", blocks: "—", status: "warn" },
  i6: { scope: "캐릭터 · 서도윤", title: "표정 기본값", desc: "이전 가이드의 무표정 대신 밝은 방향", options: "—", blocks: "—", status: "decided", decided: "밝은 방향", decidedAt: "2026.10.27" },
  i7: { scope: "채널", title: "첫 게시물", desc: "", options: "EP.01 / EP.02", blocks: "—", status: "decided", decided: "EP.01", decidedAt: "2026.10.26" },
};

const promptVersions: Record<string, PromptVersion> = {
  pv_hyun_1: { ownerType: "character", ownerId: "hyun", v: "v1", body: HYUN_PROMPT, memo: "최초 등록. 얼굴 앵커·시트 기준 반영", at: "2026.10.26", current: true },
  pv_hyun_0: { ownerType: "character", ownerId: "hyun", v: "v0", body: "(초안)", memo: "초안 (캐릭터 시트 전 작성)", at: "2026.10.20", current: false },
  pv_yoon_1: { ownerType: "character", ownerId: "yoon", v: "v1", body: YOON_PROMPT, memo: "얼굴 기준 반영안 (무쌍·큰 코·얇은 입술)", at: "2026.10.27", current: true },
};

const relationChanges: Record<string, RelationChange> = {
  rc1: { episodeId: "ep01", pair: "도윤 ↔ 이현", before: "—", after: "잔소리하는 쪽", memo: "기준점. \"냄새 맡지 마\"" },
  rc2: { episodeId: "ep02", pair: "도윤 ↔ 이현", before: "잔소리하는 쪽", after: "산책을 챙기는 쪽", memo: "동물형인 날 리드줄을 잡음" },
  rc3: { episodeId: "ep03", pair: "도윤 ↔ 이현", before: "통제하는 쪽", after: "빈틈을 들키는 쪽", memo: "애착 베개", planned: true },
};

export function seedAll(db: Database.Database) {
  const ins = (table: string, refCols: string[]) => db.prepare(`INSERT OR REPLACE INTO ${table} (id, ${refCols.concat(["data"]).join(",")}) VALUES (?, ${refCols.concat(["data"]).map(() => "?").join(",")})`);
  const tx = db.transaction(() => {
    const c = ins("characters", []); for (const [id, d] of Object.entries(characters)) c.run(id, JSON.stringify(d));
    const p = ins("places", []); for (const [id, d] of Object.entries(places)) p.run(id, JSON.stringify(d));
    const e = ins("episodes", []); for (const [id, d] of Object.entries(episodes)) e.run(id, JSON.stringify(d));
    const s = ins("shots", ["episode_id"]); for (const [id, d] of Object.entries(shots)) s.run(id, d.episodeId, JSON.stringify(d));
    const r = ins("runs", ["shot_id"]); for (const [id, d] of Object.entries(runs)) r.run(id, d.shotId, JSON.stringify(d));
    const v = ins("variants", ["run_id"]); for (const [id, d] of Object.entries(variants)) v.run(id, d.runId, JSON.stringify(d));
    const a = ins("assets", []); for (const [id, d] of Object.entries(assets)) a.run(id, JSON.stringify(d));
    const i = ins("issues", []); for (const [id, d] of Object.entries(issues)) i.run(id, JSON.stringify(d));
    const pv = ins("prompt_versions", ["owner_type", "owner_id"]); for (const [id, d] of Object.entries(promptVersions)) pv.run(id, d.ownerType, d.ownerId, JSON.stringify(d));
    const rc = ins("relation_changes", ["episode_id"]); for (const [id, d] of Object.entries(relationChanges)) rc.run(id, d.episodeId, JSON.stringify(d));
  });
  tx();
}
