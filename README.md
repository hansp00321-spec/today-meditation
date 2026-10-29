# 오늘의 묵상 (Daily Meditation) Web App

따뜻하고 평안한 느낌의 맞춤형 묵상 모바일 친화적 웹 애플리케이션입니다.  
React, Next.js (App Router), Tailwind CSS를 기반으로 제작되었으며, Make.com 웹훅과 연동하여 사용자의 고민에 따른 묵상 말씀을 생성합니다.

---

## 🌟 주요 기능

1. **따뜻하고 평안한 디자인**:
   - 웜톤(크림, 베이지, 테라코타 브라운)과 명조 서체(Gowun Batang)가 어우러진 모바일 최적화 레이아웃
   - 오늘 날짜 자동 표시 및 마음을 차분히 해주는 감성 문구
   - 원클릭 고민 추천 칩 (#마음의 평안, #불안과 걱정, #지친 하루 위로 등)
   - 품격 있는 주황/갈색 계열의 시작 버튼

2. **Make.com 웹훅 완벽 연동**:
   - 입력한 고민 텍스트를 `{ "worry": "..." }` JSON 형태로 POST 요청
   - 응답 대기 중 **"묵상 내용을 가져오는 중..."** 로딩 스피너 및 펄스 효과

3. **강력한 응답 예외 처리 (오류 방지)**:
   - Make.com 응답이 **JSON 객체(`{ "result": "..." }`, `{ "message": "..." }` 등)**이든 **일반 텍스트(Plain Text)**이든 파싱 에러 없이 100% 안전하게 수신
   - 브라우저 CORS 문제를 차단하는 Next.js 내부 API 라우트(`/api/meditation`) 지원
   - 웹훅 연결 전에도 화면 구성을 확인할 수 있는 **"데모 묵상 미리보기"** 제공

4. **묵상 카드 및 유틸리티**:
   - 수신된 묵상 내용을 감성적인 카드 형태로 출력 (줄바꿈 자동 보존)
   - 원클릭 **클립보드 복사** 및 모바일 **공유하기(Share)** 지원

---

## ⚙️ Make.com 웹훅 URL 설정 방법

프로젝트 폴더 내 `.env.local` 파일을 열고 본인의 Make.com 웹훅 URL로 교체합니다.

```env
NEXT_PUBLIC_MAKE_WEBHOOK_URL=https://hook.eu2.make.com/본인의_웹훅_주소
MAKE_WEBHOOK_URL=https://hook.eu2.make.com/본인의_웹훅_주소
```

---

## 🚀 Make.com 시나리오 구성 팁

1. **Custom Webhook 모듈** 추가:
   - Webhook URL을 복사하여 `.env.local`에 등록합니다.
   - 요청 Body 데이터: `{ "worry": "사용자가 입력한 고민" }`

2. **OpenAI / Claude / LLM 모듈** (선택 사항):
   - 전달받은 `worry` 텍스트를 바탕으로 따뜻한 위로의 말씀, 성경 구절, 기도문을 생성합니다.

3. **Webhook Response 모듈** 추가:
   - Status: `200`
   - Body: LLM 생성 텍스트 또는 `{"result": "생성된 묵상 내용"}`
   - *일반 텍스트나 JSON 형식 모두 본 웹앱에서 자동 인식하여 출력됩니다.*

---

## 💻 실행 방법

### Windows 간편 실행:
프로젝트 폴더 내 **`start-meditation.bat`** 파일을 더블 클릭하면 브라우저(`http://localhost:3000`)가 자동으로 열립니다.

### 터미널에서 실행:
```bash
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하세요.
