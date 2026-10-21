'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  Check,
  Settings,
  HelpCircle,
  AlertCircle,
  X,
  Heart,
  MessageSquareHeart,
  Send,
} from 'lucide-react';

// 추천 고민 키워드 (기존 유지)
const SUGGESTED_TOPICS = [
  '마음의 평안과 안식',
  '불안과 걱정 내려놓기',
  '지친 하루 위로와 회복',
  '선택과 진로의 지혜',
  '감사와 기쁨의 회복',
];

// 묵상 데이터 구조 인터페이스
interface ParsedMeditation {
  verse: string;
  verseRef?: string;
  title: string;
  paragraphs: string[];
}

// 모든 마크다운 헤딩(#), 볼드(**, __), HTML 굵기 태그(<b>, <strong>)를 완전히 제거하여 순수 텍스트로 만드는 함수
const stripAllBoldAndHeadings = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/^#+\s*/gm, '') // 각 줄 시작의 # ## ### 제거
    .replace(/\*\*(.*?)\*\*/g, '$1') // 모든 **볼드** 제거
    .replace(/__(.*?)__/g, '$1') // 모든 __볼드__ 제거
    .replace(/<b>(.*?)<\/b>/gi, '$1') // <b> 제거
    .replace(/<strong>(.*?)<\/strong>/gi, '$1') // <strong> 제거
    .replace(/<[^>]*>/g, '') // 모든 기타 HTML 태그 제거
    .replace(/^[\*\-_]{3,}\s*$/gm, '') // 수평선 제거 (---, ***)
    .trim();
};

// 양 끝의 따옴표 정제 함수 (중복 따옴표 방지)
const cleanQuotes = (str: string): string => {
  if (!str) return '';
  return stripAllBoldAndHeadings(str)
    .replace(/^["“'「『\s]+|["”'」』\s]+$/g, '')
    .trim();
};

// 본문 텍스트 내 마크다운 볼드/헤딩 기호를 완전히 제거하고 순수 일반 두께 텍스트로 반환하는 함수
const renderFormattedText = (text: string): string => {
  return stripAllBoldAndHeadings(text);
};

// 묵상 결과 텍스트 내 모든 마크다운 제목 기호(#), 볼드(**), 중괄호({{, }}) 제거 전처리 함수
const cleanMeditationText = (text: string): string => {
  if (!text) return '';
  let cleaned = stripAllBoldAndHeadings(text);

  // 맨 앞의 중괄호들({, {{ 등) 및 앞쪽 공백 제거
  cleaned = cleaned.replace(/^[\s{]+/, '');

  // 맨 뒤의 중괄호들(}, }} 등) 및 뒤쪽 공백 제거
  cleaned = cleaned.replace(/[\s}]+$/, '');

  // 전체를 감싸는 따옴표가 있다면 제거 후 다시 정리
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
    cleaned = cleaned.replace(/^[\s{]+/, '').replace(/[\s}]+$/, '');
  }

  return stripAllBoldAndHeadings(cleaned);
};

// Make.com 등에서 들어온 텍스트를 구조화된 묵상 데이터로 파싱하는 함수
const parseMeditationContent = (rawText: string): ParsedMeditation => {
  const cleaned = cleanMeditationText(rawText);

  // 1. [오늘의 말씀]과 [마음 토닥이기]/[묵상 메시지]/[오늘의 기도] 태그가 있는 경우 파싱
  const verseBlockMatch = cleaned.match(
    /\[오늘의\s*말씀\]([\s\S]*?)(?=\[(?:마음\s*토닥이기|묵상\s*메시지|오늘의\s*기도)\]|$)/i
  );
  const messageBlockMatch = cleaned.match(
    /\[(?:마음\s*토닥이기|묵상\s*메시지)\]([\s\S]*)/i
  );

  if (verseBlockMatch) {
    const verseLines = verseBlockMatch[1]
      .split('\n')
      .map((l) => stripAllBoldAndHeadings(l.trim()))
      .filter((l) => l.length > 0);

    let verse = '너희는 가만히 있어 내가 하나님 됨을 알지어다.';
    let verseRef = '';

    if (verseLines.length === 1) {
      verse = cleanQuotes(verseLines[0]);
    } else if (verseLines.length >= 2) {
      const lastLine = verseLines[verseLines.length - 1];
      // 마지막 줄이 성경 출처(장, 절, 편, 복음, 괄호 등)인지 검사
      if (
        lastLine.match(/(장|절|편|성경|복음|서|기|\d+:\d+)/) ||
        lastLine.startsWith('(')
      ) {
        verseRef = cleanQuotes(lastLine).replace(/[()\[\]]/g, '').trim();
        // 출처 이전의 모든 절(25절, 26절, 27절...)을 하나의 verse로 온전히 통합
        verse = verseLines.slice(0, -1).map((l) => cleanQuotes(l)).join('\n');
      } else {
        // 출처 라인이 따로 없는 경우 모든 라인이 여러 절의 구절
        verse = verseLines.map((l) => cleanQuotes(l)).join('\n');
      }
    }

    let title = '잠시 멈추어, 주님을 바라봅니다';
    let paragraphs: string[] = [];

    if (messageBlockMatch) {
      const restText = messageBlockMatch[1];
      const prayerMatch = restText.match(/\[오늘의\s*기도\]([\s\S]*)/i);
      const mainText = prayerMatch ? restText.slice(0, prayerMatch.index) : restText;

      const messageLines = mainText
        .split('\n')
        .map((l) => stripAllBoldAndHeadings(l.trim()))
        .filter((l) => l.length > 0);

      if (messageLines.length > 0) {
        title = cleanQuotes(messageLines[0]);
        paragraphs = messageLines.slice(1).map((p) => stripAllBoldAndHeadings(p));
      }

      if (prayerMatch) {
        const prayerLines = prayerMatch[1]
          .split('\n')
          .map((l) => stripAllBoldAndHeadings(l.trim()))
          .filter((l) => l.length > 0);
        paragraphs.push('[오늘의 기도]');
        paragraphs.push(...prayerLines);
      }
    }

    return {
      verse,
      verseRef,
      title,
      paragraphs: paragraphs.length > 0 ? paragraphs : ['주님의 평안이 함께하기를 소망합니다.'],
    };
  }

  // 2. 태그가 없는 일반 줄바꿈 텍스트인 경우 유연하게 파싱
  const lines = cleaned
    .split('\n')
    .map((l) => stripAllBoldAndHeadings(l.trim()))
    .filter((l) => l.length > 0);

  if (lines.length >= 3) {
    let verseRef = '';
    let startIdx = 1;

    // 두 번째 줄이 성경 장절 형태인지 확인
    if (
      lines[1].match(/(장|절|편|성경|복음|서|기|\d+:\d+)/) ||
      lines[1].startsWith('(')
    ) {
      verseRef = cleanQuotes(lines[1]).replace(/[()\[\]]/g, '').trim();
      startIdx = 2;
    }

    const firstLine = cleanQuotes(lines[0]);
    const title = cleanQuotes(lines[startIdx]) || '오늘 하루를 위한 묵상';
    const paragraphs = lines.slice(startIdx + 1).map((p) => stripAllBoldAndHeadings(p));

    return {
      verse: firstLine,
      verseRef,
      title,
      paragraphs: paragraphs.length > 0 ? paragraphs : [lines.slice(startIdx).join('\n\n')],
    };
  }

  // 폴백
  return {
    verse: '평안을 너희에게 끼치노니 곧 나의 평안을 너희에게 주노라.',
    verseRef: '요한복음 14장 27절',
    title: '오늘 당신에게 전하는 위로의 말씀',
    paragraphs: [stripAllBoldAndHeadings(cleaned)],
  };
};

export default function TodayMeditationPage() {
  const [worry, setWorry] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayString, setTodayString] = useState('');

  // 알림 토스트 (공유/복사 완료)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 건의하기 / 응원하기 모달 상태
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'support' | 'suggestion'>('support');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // 웹훅 설정 모달 & 커스텀 URL
  const [showSettings, setShowSettings] = useState(false);
  const [customWebhookUrl, setCustomWebhookUrl] = useState('');
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  const worryInputRef = useRef<HTMLTextAreaElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // 오늘 날짜 한국어 서식 지정 (예: 2026년 10월 15일 목요일)
  useEffect(() => {
    const now = new Date();
    const days = [
      '일요일',
      '월요일',
      '화요일',
      '수요일',
      '목요일',
      '금요일',
      '토요일',
    ];
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const day = days[now.getDay()];
    setTodayString(`${year}년 ${month}월 ${date}일 ${day}`);

    const savedUrl = localStorage.getItem('user_make_webhook_url');
    if (savedUrl) {
      setCustomWebhookUrl(savedUrl);
    }
  }, []);

  // 토스트 메시지 표시
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // 커스텀 웹훅 URL 저장
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('user_make_webhook_url', customWebhookUrl.trim());
    setShowSettings(false);
    showToast('웹훅 설정이 저장되었습니다.');
  };

  // 묵상 시작하기 제출 핸들러
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/meditation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          worry: worry.trim(),
          customUrl: customWebhookUrl.trim(),
        }),
      });

      const rawText = await response.text();
      let responseData: {
        success?: boolean;
        meditation?: string;
        message?: string;
        error?: string;
      } = {};

      try {
        responseData = JSON.parse(rawText);
      } catch {
        responseData = {
          success: response.ok,
          meditation: rawText,
        };
      }

      if (!response.ok || !responseData.success) {
        if (responseData.error === 'CONFIG_REQUIRED') {
          setError(
            'Make.com 웹훅 URL 설정이 필요합니다. 우측 상단 [웹훅 설정]에서 실제 Webhook URL을 등록해 주세요.'
          );
          setShowSettings(true);
        } else {
          setError(
            responseData.message ||
              `오류가 발생했습니다 (코드: ${response.status}). 다시 시도해 주세요.`
          );
        }
        return;
      }

      const meditationContent =
        responseData.meditation || '묵상 내용을 성공적으로 가져왔습니다.';
      // 맨 앞과 맨 뒤의 중괄호({{ 또는 }})를 자동으로 제거하여 화면에 출력
      setResult(cleanMeditationText(meditationContent));

      // 상단으로 부드럽게 스크롤
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : '네트워크 통신 중 오류가 발생했습니다.';
      setError(`요청 처리 중 오류가 발생했습니다: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // 결과부 버튼 1: 다시 묵상하기
  const handleResetToInput = () => {
    setResult(null);
    setError(null);
    setWorry(''); // 고민 입력창 내용 초기화
    setTimeout(() => {
      worryInputRef.current?.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  // 결과부 버튼 2: 묵상 내용 복사하기
  const handleCopyMeditation = () => {
    if (!result) return;
    const parsed = parseMeditationContent(result);
    const fullText = `[토닥 QT] ${todayString}\n\n“${parsed.verse}”\n${parsed.verseRef ? `(${parsed.verseRef})\n\n` : '\n'}${parsed.title}\n\n${parsed.paragraphs.join('\n\n')}`;

    const notice =
      '클립보드에 복사되었습니다. 메모장이나 나와의 채팅방에 붙여넣어 보세요!';

    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText).then(() => {
        showToast(notice);
      });
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = fullText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast(notice);
    }
  };

  // 결과부 버튼 4: 후원 계좌번호 복사하기
  const handleCopyDonationAccount = () => {
    const accountInfo = '농협 352-2382-9181-93 (예금주: 한상필)';
    const toastNotice =
      '후원 계좌번호가 복사되었습니다. (농협 352-2382-9181-93 한상필)\n마음을 더해주셔서 감사합니다!';

    if (navigator.clipboard) {
      navigator.clipboard.writeText(accountInfo).then(() => {
        showToast(toastNotice);
      });
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = accountInfo;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast(toastNotice);
    }
  };

  // 결과부 버튼 3: 건의하기 / 응원하기 제출
  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim()) return;

    // 피드백 전송 처리 (localStorage 저장 및 전송 완료 상태)
    const storedFeedbacks = JSON.parse(
      localStorage.getItem('user_meditation_feedbacks') || '[]'
    );
    storedFeedbacks.push({
      type: feedbackType,
      content: feedbackContent.trim(),
      date: new Date().toISOString(),
    });
    localStorage.setItem(
      'user_meditation_feedbacks',
      JSON.stringify(storedFeedbacks)
    );

    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackSubmitted(false);
      setFeedbackContent('');
      setShowFeedbackModal(false);
      showToast('소중한 의견이 전송되었습니다. 감사합니다!');
    }, 1500);
  };

  // 파싱된 묵상 데이터
  const parsedMeditation = result ? parseMeditationContent(result) : null;

  return (
    <div
      ref={topRef}
      className="min-h-screen bg-[#F8F7F4] text-[#1E2522] flex flex-col justify-between selection:bg-[#2E4F3E]/20"
    >
      {/* 토스트 알림 메시지 (하단 플로팅 안내) */}
      {toastMessage && (
        <div className="fixed bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl bg-[#1E2522]/95 backdrop-blur-xs text-white text-xs sm:text-sm font-medium shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 flex items-center gap-2.5 max-w-[92vw] sm:max-w-md text-center border border-white/10">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="leading-snug whitespace-pre-line">{toastMessage}</span>
        </div>
      )}

      {/* 중앙 레이아웃 컨테이너 (최대 너비 약 500px 모바일/웹 뷰) */}
      <div className="w-full max-w-[480px] mx-auto px-5 sm:px-6 pt-6 flex-1 flex flex-col">
        {/* ============================================================ */}
        {/* 상단 공통 헤더                                                */}
        {/* ============================================================ */}
        <header className="pt-2 pb-5">
          {/* 최상단 서브 문구 및 설정 아이콘 */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs sm:text-sm text-[#737A70]">
              오늘도 말씀 안에서 평안한 하루를 보내세요.
            </span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs text-[#8A9386] hover:text-[#2E4F3E] p-1.5 rounded-lg hover:bg-[#EAECE6] transition-colors flex items-center gap-1"
              title="Make.com 웹훅 URL 설정"
            >
              <Settings className="w-3.5 h-3.5 text-[#6D7769]" />
              <span className="text-3xs hidden sm:inline text-[#6D7769]">설정</span>
            </button>
          </div>

          {/* 메인 타이틀: 토닥 QT */}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A221D] mb-2 font-sans">
            토닥 QT
          </h1>

          {/* 날짜 표시 */}
          <div className="text-xs sm:text-sm text-[#737A70]">
            {todayString || '2026년 10월 15일 목요일'}
          </div>
        </header>

        {/* 상단 구분선 */}
        <hr className="border-t border-[#E5E5DF] mb-7" />

        {/* ============================================================ */}
        {/* Make.com 웹훅 URL 설정 간이 패널                             */}
        {/* ============================================================ */}
        {showSettings && (
          <div className="mb-6 p-4 rounded-2xl bg-white border border-[#D9DCD6] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[#2E4F3E] flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                Make.com 웹훅 URL 설정
              </h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-xs text-[#9B8C7D] hover:text-[#5C4F42]"
              >
                닫기
              </button>
            </div>
            <p className="text-2xs text-[#7A8376] mb-3 leading-relaxed">
              기본값은 <code>.env.local</code> 파일의 주소를 사용하며, 여기서 직접
              URL을 입력하여 브라우저에서 바로 테스트할 수도 있습니다.
            </p>
            <form onSubmit={handleSaveSettings} className="space-y-2">
              <input
                type="url"
                value={customWebhookUrl}
                onChange={(e) => setCustomWebhookUrl(e.target.value)}
                placeholder="https://hook.eu2.make.com/..."
                className="w-full text-xs px-3 py-2 rounded-lg bg-[#F8F7F4] border border-[#D9DCD6] focus:outline-none focus:ring-1 focus:ring-[#2E4F3E] text-[#1E2522]"
              />
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowHelpGuide(!showHelpGuide)}
                  className="text-2xs text-[#2E4F3E] underline flex items-center gap-0.5"
                >
                  <HelpCircle className="w-3 h-3" />
                  Make.com 연동 안내
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2E4F3E] hover:bg-[#243E30] rounded-lg transition-colors"
                >
                  저장하기
                </button>
              </div>
            </form>

            {showHelpGuide && (
              <div className="mt-3 pt-3 border-t border-[#EAECE6] text-2xs text-[#6B7268] space-y-1">
                <div className="font-semibold text-[#2E4F3E]">
                  💡 Make.com 시나리오 안내:
                </div>
                <div>1. Custom Webhook 모듈에서 Webhook URL 복사</div>
                <div>2. 앱에서 <code>{`{ "worry": "..." }`}</code> 형식으로 전송됨</div>
                <div>
                  3. 끝에 Webhook Response 모듈 추가 후 Body에 묵상 내용 반환
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* 화면 1: 고민 입력 화면 (이미지 2와 100% 일치)                 */}
        {/* ============================================================ */}
        {!result && (
          <section className="space-y-6">
            {/* 섹션 서브 헤더 */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1A221D] mb-1.5">
                잠시 멈추고, 마음을 돌보는 시간
              </h2>
              <p className="text-xs sm:text-sm text-[#666E63]">
                오늘의 말씀과 함께 차분히 하루를 돌아보세요.
              </p>
            </div>

            {/* 입력 폼 영역 */}
            <div className="space-y-3">
              <label
                htmlFor="worry-input"
                className="block text-xs sm:text-sm font-bold text-[#2A312B]"
              >
                나의 고민 입력하기
              </label>

              {/* 텍스트 영역 (예시 문구 유지) */}
              <div className="relative">
                <textarea
                  id="worry-input"
                  ref={worryInputRef}
                  value={worry}
                  onChange={(e) => setWorry(e.target.value)}
                  placeholder="예: 진로에 대한 불안감, 사람과의 관계에서 오는 피로감..."
                  rows={4}
                  maxLength={500}
                  disabled={loading}
                  className="w-full p-4 rounded-xl bg-white border border-[#D9DCD6] text-sm text-[#1A221D] placeholder-[#A4AAA0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B85838]/30 focus:border-[#B85838] transition-all resize-none shadow-2xs disabled:opacity-60"
                />
                <div className="absolute right-3 bottom-3 text-3xs text-[#A4AAA0]">
                  {worry.length}/500
                </div>
              </div>

              {/* 가벼운 키워드로 시작하기 (사용자 요청: 유지) */}
              <div className="pt-1">
                <span className="text-2xs font-medium text-[#7A8376] block mb-2">
                  가벼운 키워드로 시작하기
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setWorry(topic)}
                      disabled={loading}
                      className="px-2.5 py-1 rounded-full text-xs text-[#4F594C] bg-[#ECEFEA] hover:bg-[#DEE3DC] active:scale-95 transition-all border border-[#DAE0D7]"
                    >
                      #{topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* 외부 서비스 전송 안내 문구 (글자 크기 축소 및 문구 변경) */}
              <p className="text-[11px] sm:text-xs text-[#8E958A] leading-tight pt-0.5">
                입력하신 내용은 묵상 요청을 위해 외부 서비스로 전송되나, 수집되거나 저장되지 않습니다.
              </p>

              {/* 에러 메시지 알림 */}
              {error && (
                <div className="p-3.5 rounded-xl bg-[#FDF2F0] border border-[#F5C6CB] text-[#9E2B25] text-xs space-y-1 mt-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed flex-1">{error}</span>
                  </div>
                </div>
              )}

              {/* 제출 버튼: "오늘의 묵상 시작하기" (주황/갈색 테라코타 버튼) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`w-full py-4 rounded-xl text-white font-bold text-sm sm:text-base transition-all duration-200 shadow-2xs flex items-center justify-center gap-2 ${
                    loading
                      ? 'bg-[#A34A2D] cursor-wait opacity-90 animate-soft-pulse'
                      : 'bg-[#B85838] hover:bg-[#A34A2D] active:scale-[0.99]'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>묵상 내용을 가져오는 중...</span>
                    </>
                  ) : (
                    <span>오늘의 묵상 시작하기</span>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* 화면 2: 묵상 결과 화면 (이미지 1과 100% 일치)                 */}
        {/* ============================================================ */}
        {result && parsedMeditation && (
          <section className="space-y-6 animate-in fade-in duration-300 meditation-result-area">
            {/* 1. 오늘의 말씀 카드 (첫 번째 절 포함 모든 구절 100% 동일한 일반 굵기 font-normal) */}
            <div className="bg-[#EEF2EB] border border-[#DEE5D9] rounded-2xl p-5 sm:p-6 space-y-2.5">
              <div className="text-xs font-semibold text-[#5B6D57] meditation-section-label">
                오늘의 말씀
              </div>
              <blockquote className="meditation-verse-text whitespace-pre-line text-sm sm:text-base font-normal text-[#1A221D] leading-relaxed">
                {stripAllBoldAndHeadings(parsedMeditation.verse)}
              </blockquote>
              {parsedMeditation.verseRef && (
                <div className="text-xs sm:text-sm text-[#5B6D57] font-normal pt-0.5">
                  {stripAllBoldAndHeadings(parsedMeditation.verseRef)}
                </div>
              )}
            </div>

            {/* 2. 마음 토닥이기 및 오늘의 기도 본문 (일반 두께 font-normal) */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-[#5B6D57] meditation-section-label">
                  마음 토닥이기
                </div>
                {parsedMeditation.title && (
                  <h2 className="text-sm sm:text-base font-normal text-[#1A221D] tracking-tight">
                    {parsedMeditation.title}
                  </h2>
                )}
              </div>

              <div className="space-y-3.5">
                {parsedMeditation.paragraphs.map((para, idx) => {
                  const trimmed = para.trim();
                  if (trimmed === '[오늘의 기도]' || trimmed === '오늘의 기도') {
                    return (
                      <div key={idx} className="pt-2">
                        <div className="text-xs font-semibold text-[#5B6D57] mb-1.5 meditation-section-label">
                          오늘의 기도
                        </div>
                      </div>
                    );
                  }

                  return (
                    <p
                      key={idx}
                      className="meditation-body-text whitespace-pre-line text-sm sm:text-base font-normal text-[#38413A] leading-relaxed"
                    >
                      {renderFormattedText(para)}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* 3. 결과부 버튼들 (2x2 그리드 배치) */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. 다시 묵상하기 */}
                <button
                  type="button"
                  onClick={handleResetToInput}
                  className="w-full py-3.5 px-2 rounded-xl bg-[#2E4F3E] hover:bg-[#243E30] active:scale-[0.98] text-white font-bold text-sm sm:text-base transition-all shadow-xs text-center"
                >
                  다시 묵상하기
                </button>

                {/* 2. 내용 복사하기 */}
                <button
                  type="button"
                  onClick={handleCopyMeditation}
                  className="w-full py-3.5 px-2 rounded-xl bg-[#2E4F3E] hover:bg-[#243E30] active:scale-[0.98] text-white font-bold text-sm sm:text-base transition-all shadow-xs text-center"
                >
                  내용 복사하기
                </button>

                {/* 3. 건의하기 */}
                <a
                  href="https://open.kakao.com/o/s2QXxuSi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-2 rounded-xl bg-[#2E4F3E] hover:bg-[#243E30] active:scale-[0.98] text-white font-bold text-sm sm:text-base transition-all shadow-xs text-center inline-flex items-center justify-center"
                >
                  건의하기
                </a>

                {/* 4. 후원하기 (계좌번호 복사) */}
                <button
                  type="button"
                  onClick={handleCopyDonationAccount}
                  className="w-full py-3.5 px-2 rounded-xl bg-[#2E4F3E] hover:bg-[#243E30] active:scale-[0.98] text-white font-bold text-sm sm:text-base transition-all shadow-xs text-center"
                >
                  후원하기
                </button>
              </div>

              {/* 후원 안내 문구 */}
              <p className="text-[11px] sm:text-xs text-[#8A9086] text-center leading-relaxed pt-1 pb-1">
                이 웹은 성도님들의 자발적인 후원으로 광고 없이 깨끗하게 운영됩니다.
              </p>
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* 하단 면책 조항 푸터 (이미지 1 & 2 공통)                       */}
        {/* ============================================================ */}
        <footer className="pt-8 pb-10">
          <hr className="border-t border-[#E5E5DF] mb-6" />
          <p className="text-2xs sm:text-xs text-[#8E958A] text-center leading-relaxed max-w-sm mx-auto">
            본 서비스는 일상 속 가벼운 묵상과 자기 성찰을 돕기 위한 도구입니다. 전문적인 심리 상담이나 목회적 지도, 의료 행위를 대체하지 않습니다.
          </p>
        </footer>
      </div>

      {/* ============================================================ */}
      {/* "건의하기 / 응원하기" 팝업 모달                                */}
      {/* ============================================================ */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#D9DCD6] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAECE6]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#EEF2EB] flex items-center justify-center text-[#2E4F3E]">
                  <MessageSquareHeart className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#1A221D]">
                  건의하기 / 후원하기
                </h3>
              </div>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="p-1 rounded-full text-[#8A9386] hover:text-[#1A221D] hover:bg-[#F0F2ED] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#6B7268] leading-relaxed">
              이 웹은 성도님들의 자발적인 후원으로 광고 없이 깨끗하게 운영됩니다. 보내주시는 관심과 소중한 제안은 더 평안한 묵상 서비스를 만들어가는 데 큰 힘이 됩니다.
            </p>

            {/* 피드백 유형 선택 탭 */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F5F6F2] rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFeedbackType('support')}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  feedbackType === 'support'
                    ? 'bg-white text-[#2E4F3E] shadow-xs'
                    : 'text-[#7A8376] hover:text-[#2E4F3E]'
                }`}
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>후원하기</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedbackType('suggestion')}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  feedbackType === 'suggestion'
                    ? 'bg-white text-[#2E4F3E] shadow-xs'
                    : 'text-[#7A8376] hover:text-[#2E4F3E]'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>건의하기</span>
              </button>
            </div>

            {/* 입력 폼 */}
            <form onSubmit={handleFeedbackSubmit} className="space-y-3 pt-1">
              <textarea
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                placeholder={
                  feedbackType === 'support'
                    ? '성도님의 따뜻한 응원의 한마디나 후원 관련 메시지를 남겨주세요.'
                    : '추가되었으면 하는 기능이나 개선할 점을 자유롭게 적어주세요.'
                }
                rows={4}
                maxLength={300}
                required
                className="w-full p-3.5 text-xs sm:text-sm rounded-xl bg-[#F8F7F4] border border-[#D9DCD6] text-[#1E2522] placeholder-[#A4AAA0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2E4F3E]/30 focus:border-[#2E4F3E] transition-all resize-none"
              />

              <div className="flex items-center justify-between text-2xs text-[#A4AAA0]">
                <span>{feedbackContent.length}/300</span>
                <span>보내주신 의견은 서비스 개선에 반영됩니다.</span>
              </div>

              {/* 전송 버튼 */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={feedbackSubmitted || !feedbackContent.trim()}
                  className="w-full py-3 rounded-xl bg-[#2E4F3E] hover:bg-[#243E30] disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  {feedbackSubmitted ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>전송 완료! 감사합니다.</span>
                    </>
                  ) : (
                    <span>소중한 의견 보내기</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
