import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const worry = typeof body.worry === 'string' ? body.worry.trim() : '';
    const customUrl = typeof body.customUrl === 'string' ? body.customUrl.trim() : '';

    // 환경 변수 또는 요청받은 커스텀 URL 확인
    const webhookUrl =
      customUrl ||
      process.env.MAKE_WEBHOOK_URL ||
      process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL ||
      '';

    // 기본 템플릿 URL이거나 미설정 상태인 경우 친절한 안내 제공
    if (!webhookUrl || webhookUrl.includes('YOUR_WEBHOOK_URL')) {
      return NextResponse.json(
        {
          success: false,
          error: 'CONFIG_REQUIRED',
          message:
            'Make.com 웹훅 URL이 아직 설정되지 않았습니다. .env.local 파일 또는 환경 변수에 실제 Make.com 웹훅 URL을 설정해 주세요.',
        },
        { status: 400 }
      );
    }

    // Make.com 웹훅으로 POST 요청 전송
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60초 타임아웃

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
        },
        body: JSON.stringify({
          worry: worry || '오늘의 평안을 위한 묵상',
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 응답 텍스트를 먼저 안전하게 추출 (Plain text / JSON 모두 지원)
      const rawText = await response.text();

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            error: `WEBHOOK_ERROR_${response.status}`,
            message: `Make.com 웹훅 응답 오류 (상태 코드: ${response.status})`,
            detail: rawText || '응답 내용이 없습니다.',
          },
          { status: response.status }
        );
      }

      // JSON 파싱 시도 (오류 발생하지 않도록 try-catch 처리)
      let parsedContent = rawText;
      let parsedJson: Record<string, unknown> | null = null;

      try {
        const json = JSON.parse(rawText);
        parsedJson = json;

        if (json && typeof json === 'object') {
          // 다양한 응답 키 지원 (result, message, meditation, content, text, data 등)
          if (typeof json.result === 'string') {
            parsedContent = json.result;
          } else if (typeof json.message === 'string') {
            parsedContent = json.message;
          } else if (typeof json.meditation === 'string') {
            parsedContent = json.meditation;
          } else if (typeof json.content === 'string') {
            parsedContent = json.content;
          } else if (typeof json.text === 'string') {
            parsedContent = json.text;
          } else if (typeof json.data === 'string') {
            parsedContent = json.data;
          } else {
            // 문자열 타입인 첫 번째 필드 탐색
            const firstStringValue = Object.values(json).find(
              (val) => typeof val === 'string'
            );
            if (typeof firstStringValue === 'string') {
              parsedContent = firstStringValue;
            } else {
              parsedContent = JSON.stringify(json, null, 2);
            }
          }
        } else if (typeof json === 'string') {
          parsedContent = json;
        }
      } catch {
        // Plain text 형태인 경우 rawText 그대로 사용
        parsedContent = rawText;
      }

      // 맨 앞과 맨 뒤의 중괄호({{, }}, {, } 등), 마크다운 제목(#), 불필요한 공백/따옴표 제거 후처리
      const cleanBraces = (text: string): string => {
        if (!text) return '';
        let cleaned = text.trim();
        // 모든 라인의 마크다운 헤딩(#, ##, ### 등) 기호 제거
        cleaned = cleaned.replace(/^#+\s*/gm, '');
        // 맨 앞의 중괄호들({, {{ 등) 및 앞쪽 공백 제거
        cleaned = cleaned.replace(/^[\s{]+/, '');
        // 맨 뒤의 중괄호들(}, }} 등) 및 뒤쪽 공백 제거
        cleaned = cleaned.replace(/[\s}]+$/, '');
        // 전체를 감싸는 따옴표가 있다면 제거
        if (
          (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
          (cleaned.startsWith("'") && cleaned.endsWith("'"))
        ) {
          cleaned = cleaned.slice(1, -1).trim();
          cleaned = cleaned.replace(/^[\s{]+/, '').replace(/[\s}]+$/, '');
        }
        // 혹시 남은 맨 앞 헤딩 기호 재정리
        cleaned = cleaned.replace(/^#+\s*/gm, '');
        return cleaned.trim();
      };

      parsedContent = cleanBraces(parsedContent);

      // 텍스트가 비어있는 경우 기본 메시지
      if (!parsedContent || parsedContent.trim().length === 0) {
        parsedContent =
          'Make.com에서 빈 응답이 도착했습니다. Make.com 시나리오의 "Webhook response" 모듈 설정을 확인해 주세요.';
      }

      return NextResponse.json({
        success: true,
        meditation: parsedContent,
        isJson: parsedJson !== null,
        timestamp: new Date().toISOString(),
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      const isAbort =
        fetchError instanceof Error && fetchError.name === 'AbortError';

      return NextResponse.json(
        {
          success: false,
          error: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: isAbort
            ? '묵상 내용을 가져오는 데 시간이 너무 오래 걸립니다 (60초 초과). Make.com 시나리오를 확인해 주세요.'
            : 'Make.com 웹훅 서버에 연결하지 못했습니다. URL이 올바른지 확인해 주세요.',
        },
        { status: 502 }
      );
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : '알 수 없는 서버 오류';
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '요청 처리 중 오류가 발생했습니다: ' + errorMessage,
      },
      { status: 500 }
    );
  }
}
