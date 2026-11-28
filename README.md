# DIAMOND RISE AI STUDIO

로컬에서 실행하는 AI 개발 스튜디오 프로젝트입니다. 백엔드는 Java 21과 Spring Boot, 화면은 React와 TypeScript를 사용합니다.

IntelliJ IDEA에서 이 프로젝트의 루트 폴더를 열면 `backend`와 `frontend`를 함께 볼 수 있습니다. 루트 `pom.xml`이 Spring Boot 백엔드 모듈을 불러오므로 한 프로젝트 창에서 Java와 화면 코드를 함께 확인할 수 있습니다.

## Backend

루트 폴더를 열어 `backend` Maven 모듈을 불러오고, Project SDK와 언어 수준을 JDK 21로 설정합니다. `StudioApplication`을 실행하면 됩니다. Run 창의 정지 버튼으로 끄고, 초록 실행 버튼으로 다시 켭니다. 백엔드는 8080 포트를 사용합니다. 디렉터 지시와 부서 의견은 `backend/data`에 로컬로 저장됩니다.

기본 상태 확인 주소:

```text
http://localhost:8080/api/v1/health
```

## Local AI

AI는 Ollama를 통해 PC 안에서 실행합니다. 기본 모델은 `qwen3:4b-instruct-2507-q4_K_M`이며, 네 부서가 이 모델을 각자의 역할 지침과 함께 사용합니다. Ollama를 설치한 뒤 처음 한 번 모델을 내려받습니다.

```text
ollama pull qwen3:4b-instruct-2507-q4_K_M
```

Ollama가 실행 중인지 `http://localhost:11434`에서 확인할 수 있습니다. 앱에는 하나의 게임 프로젝트 `DIAMOND RISE: ROOKIE`가 있고, 사용자는 그 안에 여러 디렉터 지시를 등록합니다. 지시를 선택하고 **세 부서 의견 받기**를 누르면 기획·개발·아트팀이 같은 지시를 차례로 검토하고 각자 한국어 의견을 저장합니다. 한 모델을 차례로 호출하므로 응답에 시간이 걸릴 수 있습니다. 부서별 의견은 제안이며 게임 파일을 수정하거나 명령을 실행하지 않습니다.

기본 모델이나 Ollama 주소를 바꾸려면 백엔드 환경 변수 `OLLAMA_MODEL` 또는 `OLLAMA_BASE_URL`을 지정합니다. AI 요청은 Ollama의 로컬 API `http://127.0.0.1:11434/api/chat`로 전송됩니다.

## Frontend

Node.js LTS와 npm이 필요합니다. `frontend` 폴더에서 다음 명령으로 화면을 실행합니다.

```text
npm install
npm run dev
```

Vite 개발 서버는 `http://localhost:5173`에서 열립니다. `/api` 요청은 로컬 Spring Boot 서버 `http://localhost:8080`으로 전달됩니다.

현재 버전은 하나의 게임 프로젝트 아래에 디렉터 지시 여러 건을 두고, 각 지시와 부서 의견 및 종합 계획을 `backend/data`의 로컬 H2 데이터베이스에 저장합니다. 세 의견이 모이면 `POST /api/v1/requests/{id}/plan`으로 공통점, 충돌과 질문, 제안 단계, 담당 부서, 결과물, 완료 기준과 위험을 정리한 계획 초안을 생성할 수 있습니다. 디렉터 승인 API는 세 의견과 실제 생성된 종합 계획이 모두 있을 때만 승인 기록을 남깁니다. 승인과 실행 상태는 분리되어 승인된 지시는 `WAITING_FOR_UNITY`가 됩니다. Unity 프로젝트 연결과 실행기는 아직 없어 게임 파일이나 에셋을 실행·생성하지 않습니다. 작업을 이어갈 때는 프로젝트 루트의 `DEVELOPMENT-GUIDE.md`를 확인하세요.
