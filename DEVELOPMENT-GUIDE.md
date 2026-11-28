# DIAMOND RISE AI STUDIO 개발 이어가기 안내

이 문서는 작업이 중단되거나 다른 개발자에게 넘겨질 때, 프로젝트 구조와 현재 구현을 빠르게 파악하고 안전하게 이어가도록 정리한 안내서입니다.

## 프로젝트 목표

한 게임 프로젝트 `DIAMOND RISE: ROOKIE` 안에서 디렉터가 기능 지시를 등록합니다. 기획·개발·아트팀이 각각 의견을 내고, 총괄 AI가 하나의 계획으로 합칩니다. 디렉터가 계획을 승인한 뒤 Unity 게임 코드와 아트 에셋을 격리된 작업공간에서 만들고, 변경 내용·빌드·미리보기를 검토하는 로컬 우선 스튜디오가 목표입니다.

현재는 부서 의견, 종합 계획, 승인 기록과 실행 상태의 첫 구분까지 구현되어 있습니다. Unity 실행기·에셋 제작기는 아직 없으며, 승인만으로 게임 파일을 변경하지 않습니다.

## 개발 환경과 주요 경로

- 프로젝트 루트: `C:\Users\qodbs\Documents\Codex\2026-11-25\referenced-chatgpt-conversation-this-is-an\outputs\DIAMOND-RISE-AI-STUDIO`
- 백엔드: Java 21, Spring Boot 3.5, Maven, 포트 8080
- 화면: React, TypeScript, Vite, 개발 포트 5173
- 로컬 AI: Ollama, 기본 모델 `qwen3:4b-instruct-2507-q4_K_M`, 포트 11434
- 요청 데이터: `backend/data/diamond-rise`의 로컬 H2 파일 DB
- Unity 게임 프로젝트: 이 저장소에는 연결되어 있지 않음. 실제 경로와 Unity 버전을 사용자에게 확인해야 함.

IntelliJ IDEA에서 프로젝트 루트를 열면 루트 `pom.xml`이 백엔드 모듈을 불러옵니다. Project SDK는 JDK 21로 선택하고 `backend/src/main/java/com/diamondrise/studio/StudioApplication.java`의 `StudioApplication`을 실행합니다. Node.js LTS가 설치되어 있으면 터미널에서 `frontend` 폴더로 이동해 `npm install`을 한 번 실행한 후 `npm run dev`를 실행합니다. 화면은 `http://localhost:5173`, API 상태 확인은 `http://localhost:8080/api/v1/health`입니다.

Ollama 앱은 별도로 실행되어야 합니다. 모델 설치는 PC에서 한 번만 `ollama pull qwen3:4b-instruct-2507-q4_K_M`으로 진행합니다. 모델 응답은 동일 모델을 부서별로 순차 호출하기 때문에 시간이 걸릴 수 있습니다.

## 파일 지도

### 백엔드

- `backend/src/main/java/com/diamondrise/studio/StudioApplication.java` — Spring Boot 시작점.
- `backend/src/main/java/com/diamondrise/studio/request/WorkRequest.java` — 디렉터 지시, 의견, 계획, 승인 및 실행 상태의 저장 모델.
- `backend/src/main/java/com/diamondrise/studio/request/RequestStatus.java` — 승인 검토 상태: 검토 중, 승인, 반려.
- `backend/src/main/java/com/diamondrise/studio/request/ExecutionStatus.java` — 승인 후 실행 준비 상태.
- `backend/src/main/java/com/diamondrise/studio/request/WorkRequestController.java` — 지시 API와 승인 전제 검증, 응답 DTO.
- `backend/src/main/java/com/diamondrise/studio/request/WorkRequestRepository.java` — H2 지시 조회·저장.
- `backend/src/main/java/com/diamondrise/studio/ai/DepartmentAgentService.java` — Ollama 호출, 부서별 의견과 종합 계획 생성.
- `backend/src/main/resources/application.properties` — 백엔드 포트, H2, Ollama 기본값.

### 프런트엔드

- `frontend/src/App.tsx` — 전체 화면, 프로젝트 요약, 지시 등록과 모달.
- `frontend/src/useStudio.ts` — API 연결, 로딩·오류·작업 상태.
- `frontend/src/api.ts` — 기본 API 요청과 명시적 샘플 미리보기 어댑터.
- `frontend/src/types.ts` — 백엔드 DTO와 상태 타입. 백엔드 응답을 바꾸면 함께 맞춥니다.
- `frontend/src/ReviewWorkspace.tsx` — 지시 검토, 부서 의견, 결정 기록과 승인 안내.
- `frontend/src/SynthesisPanel.tsx` — 종합 계획 표시 및 생성.
- `frontend/src/previewFixtures.ts` — 로컬 AI 없이 화면을 확인하는 고정 샘플.
- `frontend/src/requests.css`, `frontend/src/styles.css` — 검토 화면과 공통 스타일.

## 현재 데이터 흐름

1. `POST /api/v1/requests`가 지시를 저장합니다.
2. `POST /api/v1/requests/{id}/opinions`가 Ollama를 호출해 기획·개발·아트 의견을 차례로 만들고 한 번에 저장합니다.
3. `POST /api/v1/requests/{id}/plan`은 세 의견이 모두 있을 때 종합 계획을 만들고 저장합니다.
4. `PATCH /api/v1/requests/{id}/decision`은 승인 또는 반려를 기록합니다. 승인은 세 의견과 생성된 계획을 모두 요구합니다.
5. 승인 시 응답의 `executionStatus`는 `WAITING_FOR_UNITY`가 됩니다. 이는 Unity 경로와 실행기가 아직 연결되지 않았다는 뜻이며, 코드 실행은 일어나지 않습니다.

일반 상태와 실행 상태는 별도 필드입니다.

| 필드 | 현재 값 | 의미 |
| --- | --- | --- |
| `status` | `PENDING_APPROVAL` | 의견과 계획 검토 중 |
| `status` | `APPROVED` | 디렉터 승인 기록 완료 |
| `status` | `REJECTED` | 디렉터 반려 기록 완료 |
| `executionStatus` | `NOT_STARTED` | 아직 승인 전이거나 실행 흐름 전 |
| `executionStatus` | `WAITING_FOR_UNITY` | 승인됐지만 Unity 프로젝트/실행기 연결 대기 |
| `executionStatus` | `READY`, `RUNNING`, `COMPLETED`, `FAILED` | 후속 실행기 구현을 위한 상태 값. 현재 이를 전환하는 실행기는 없음 |

`WorkRequest` 응답 DTO는 `executionStatus`를 포함합니다. 기존 H2 행에 새 컬럼이 아직 없거나 값이 비어 있어도 기존 승인 행은 `WAITING_FOR_UNITY`로 읽히도록 getter가 호환 처리를 합니다. JPA의 `ddl-auto=update`가 새 컬럼을 추가합니다.

## 샘플 화면과 실제 모드

기본 모드는 Spring Boot API에 연결합니다. 화면만 분리해 볼 때는 Vite 실행 시 `VITE_STUDIO_PREVIEW=true`를 지정합니다. 예를 들어 PowerShell에서:

```powershell
$env:VITE_STUDIO_PREVIEW = 'true'
npm run dev -- --port 5174
```

샘플 모드는 정적 데이터만 메모리에서 바꾸며 H2·Ollama·실제 API를 사용하지 않습니다. 브라우저를 새로고침하면 샘플 변경이 초기화됩니다. `frontend/public`의 `manus-routes.json`은 Manus 미리보기 전용 파일이므로 실제 앱에 다시 가져오지 않습니다.

## 확인 방법

자동 테스트를 새로 추가하거나 실행하기 전에는 사용자의 요청 범위를 확인합니다. 코드 변경 뒤 빌드 확인이 필요하면:

```powershell
cd frontend
npm run build
```

```powershell
cd <프로젝트 루트>
mvn -DskipTests compile
```

이번 실행 상태 변경 후 프런트엔드 TypeScript 검사와 Vite 프로덕션 빌드가 통과했습니다. Java 21은 설치되어 있지만 이 PC에서 Maven 실행 파일과 프로젝트 Maven Wrapper를 찾지 못해 이번 백엔드 컴파일은 실행하지 못했습니다. Maven을 사용할 수 있게 한 뒤 `mvn -DskipTests compile`로 확인해야 합니다. 실제 Ollama 의견 생성·계획 생성·승인 흐름은 로컬 서버와 모델을 켜고 확인해야 하며, 새 지시를 생성하면 H2 DB에 기록이 남습니다.

## 다음 개발 단계

1. Unity 게임 프로젝트 폴더 경로, Unity 버전, 현재 버전 관리 방식(Git 여부)을 사용자에게 확인합니다. 지금까지 프로젝트 경로는 확인되지 않았습니다.
2. 경로가 확인되면 설정 화면/환경변수로 프로젝트 루트를 등록하고, 실제 디렉터리 존재와 Unity 프로젝트 구조를 읽기 전용으로 검증합니다.
3. Unity 프로젝트를 직접 덮어쓰지 않는 격리 작업공간(별도 브랜치 또는 복사 작업영역)을 설계합니다. 기존 변경 사항이 있는 경우 보존하고, 자동 이동·초기화·삭제를 하지 않습니다.
4. 승인된 계획만 실행하는 실행기를 추가합니다. 파일 허용 범위, 변경 diff, 취소·롤백, 실행 로그를 사용자 검토에 노출합니다. 셸 명령 임의 실행은 기본 허용하지 않습니다.
5. 먼저 선수 성장 기능 하나를 작은 범위로 구현하고 Unity 컴파일·실행 화면을 확인합니다.
6. 이후 아트 생성 공급자·비용·파일 형식을 정하고, UI 이미지부터 가져오기·연결을 진행합니다. 캐릭터 리깅·애니메이션·야구장 제작은 별도 단계입니다.

## 저장소 주의사항과 인수인계 요령

현재 로컬 폴더의 Git은 `main` 브랜치에 커밋이 없고 파일들이 미추적 상태입니다. GitHub에는 별도 작업 브랜치의 초안 PR이 있지만, 이 로컬 폴더가 해당 원격 브랜치에 연결됐다고 가정하지 마세요. 이 폴더에서 `git push`, reset, clean, 재초기화를 하기 전에 원격과 브랜치를 먼저 확인해야 합니다. 사용자 계정·토큰·API 키는 문서나 저장소에 기록하지 않습니다.

작업을 넘길 때는 이 문서의 “현재 데이터 흐름”, “파일 지도”, “다음 개발 단계”를 기준으로 확인하고, 먼저 `git status`와 서버 포트 상태를 읽어 현재 변경 및 실행 중인 서버를 파악합니다. 이미 켜진 Spring Boot·Vite·Ollama를 중복 실행하지 않습니다. 배포는 사용자 요청 전까지 진행하지 않습니다.
