import { useEffect, useState } from 'react';
import './requests.css';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Command,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  Menu,
  Plus,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';

type HealthStatus = 'checking' | 'connected' | 'offline';
type RequestStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
type WorkRequest = {
  id: string;
  title: string;
  description: string;
  team: string;
  plan: string | null;
  planModel: string | null;
  opinions: { team: string; content: string; model: string }[];
  status: RequestStatus;
  createdAt: string;
  decidedAt: string | null;
};

async function getRequests(): Promise<WorkRequest[]> {
  const response = await fetch('/api/v1/requests');
  if (!response.ok) throw new Error('요청 목록을 불러오지 못했습니다.');
  return response.json();
}

const navItems = [
  { label: '대시보드', icon: LayoutDashboard },
  { label: '업무 보드', icon: ClipboardCheck, badge: '준비 중' },
  { label: 'AI 조직', icon: UsersRound, badge: '준비 중' },
  { label: '게임 프로젝트', icon: FolderKanban, badge: '준비 중' },
  { label: '작업 기록', icon: GitBranch, badge: '준비 중' },
];

const departments = [
  { name: '기획팀', role: '시스템 · 밸런스 · 콘텐츠', initials: 'PL', className: 'team-planning' },
  { name: '개발팀', role: 'Unity · 게임플레이 · 도구', initials: 'DEV', className: 'team-development' },
  { name: '아트팀', role: '캐릭터 · UI · 연출', initials: 'ART', className: 'team-art' },
  { name: 'QA팀', role: '테스트 · 품질 검토', initials: 'QA', className: 'team-qa' },
];

function App() {
  const [health, setHealth] = useState<HealthStatus>('checking');
  const [activeNav, setActiveNav] = useState('대시보드');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showApprovalInfo, setShowApprovalInfo] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requests, setRequests] = useState<WorkRequest[]>([]);
  const [activeDirectiveId, setActiveDirectiveId] = useState('');
  const [draft, setDraft] = useState({ title: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const activeDirective = requests.find((request) => request.id === activeDirectiveId) ?? requests[0];

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/v1/health', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Backend unavailable');
        return response.json();
      })
      .then(() => setHealth('connected'))
      .catch(() => {
        if (!controller.signal.aborted) setHealth('offline');
      });

    getRequests()
      .then((items) => {
        setRequests(items);
        if (items.length > 0) setActiveDirectiveId(items[0].id);
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setLoadError(error.message);
      });

    return () => controller.abort();
  }, []);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/v1/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, team: '공동 프로젝트' }),
      });
      if (!response.ok) throw new Error('디렉터 지시를 저장하지 못했습니다. 입력 내용을 확인해 주세요.');
      const created: WorkRequest = await response.json();
      setRequests((current) => [created, ...current]);
      setActiveDirectiveId(created.id);
      setDraft({ title: '', description: '' });
      setShowRequestForm(false);
      setNotice('디렉터 지시를 저장했습니다. 세 부서 의견을 요청해 보세요.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '요청 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function decideRequest(id: string, approved: boolean) {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(`/api/v1/requests/${id}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      if (!response.ok) throw new Error('지시 상태를 저장하지 못했습니다. 다시 불러와 주세요.');
      const updated: WorkRequest = await response.json();
      setRequests((current) => current.map((request) => request.id === id ? updated : request));
      setNotice(approved
        ? '지시 승인을 기록했습니다. 실제 개발 작업은 아직 실행되지 않았습니다.'
        : '지시 반려를 기록했습니다.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '상태 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function requestDepartmentOpinions(id: string) {
    setBusy(true);
    setNotice('기획·개발·아트팀이 지시사항을 차례로 검토하고 있습니다. 로컬 모델 응답까지 잠시 걸릴 수 있어요.');
    try {
      const response = await fetch(`/api/v1/requests/${id}/opinions`, { method: 'POST' });
      if (!response.ok) throw new Error(response.status === 503
        ? 'Ollama가 응답하지 않습니다. Ollama 실행 상태를 확인해 주세요.'
        : '부서 의견을 받지 못했습니다. 잠시 후 다시 시도해 주세요.');
      const updated: WorkRequest = await response.json();
      setRequests((current) => current.map((request) => request.id === id ? updated : request));
      setNotice('세 부서 의견을 모두 받았습니다. 비교한 뒤 이 지시의 승인 여부를 정해 주세요.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '부서 의견 요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  const statusText = {
    checking: '연결 확인 중',
    connected: '로컬 스튜디오 연결됨',
    offline: '백엔드 연결 끊김',
  }[health];

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-scrim" type="button" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} aria-hidden={!sidebarOpen} inert={!sidebarOpen}>
        <div className="brand-lockup">
          <div className="brand-mark"><span>DR</span><i /></div>
          <div>
            <div className="brand-name">DIAMOND RISE</div>
            <div className="brand-caption">AI DEVELOPMENT STUDIO</div>
          </div>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-icon"><Command size={16} /></div>
          <div className="workspace-copy"><span>워크스페이스</span><strong>DIAMOND RISE</strong></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <div className="nav-label">STUDIO</div>
        <nav className="main-nav" aria-label="주 메뉴">
          {navItems.map(({ label, icon: Icon, badge }) => (
            <button
              className={`nav-item ${activeNav === label ? 'active' : ''}`}
              key={label}
              onClick={() => { setActiveNav(label); setSidebarOpen(false); }}
              type="button"
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {badge && <small>{badge}</small>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="help-icon"><CircleHelp size={17} /></div>
            <div><strong>함께 만들어가요</strong><span>모든 결정은 디렉터가 승인합니다.</span></div>
          </div>
          <button className="profile-button" type="button">
            <div className="avatar">YJ</div>
            <div className="profile-copy"><strong>디렉터</strong><span>최종 승인자</span></div>
            <ChevronDown size={15} className="muted-icon" />
          </button>
        </div>
      </aside>

      <main className="main-area" onClick={() => { if (sidebarOpen) setSidebarOpen(false); }}>
        <header className="topbar">
          <div className="topbar-leading">
            <button className="menu-toggle" type="button" aria-label="카테고리 메뉴 열기" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)}><Menu size={19} /></button>
            <div className="breadcrumb"><span>DIAMOND RISE</span><i>/</i><strong>{activeNav}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className={`connection-pill ${health}`}><span className="connection-dot" />{statusText}</div>
            <button className="primary-button top-new-project" onClick={() => setShowRequestForm(true)} type="button"><Plus size={15} /> 새 지시</button>
          </div>
        </header>

        <div className="page-content">
          <section className="review-welcome">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> MAGI PROJECT REVIEW</div>
              <h1>세 부서의 판단을 한눈에</h1>
              <p>하나의 게임 프로젝트 안에서 디렉터 지시와 부서 의견을 관리합니다.</p>
            </div>
            <button className="text-button review-help" onClick={() => setShowApprovalInfo(true)} type="button"><ShieldCheck size={15} /> 승인 흐름</button>
          </section>

          {loadError && <div className="inline-error page-message">{loadError} IntelliJ에서 백엔드를 실행해 주세요.</div>}
          {notice && <div className="inline-notice page-message" role="status">{notice}</div>}

          <section className="umbrella-project">
            <div className="umbrella-mark">DR<span>·</span></div>
            <div className="umbrella-copy"><span className="section-kicker">MAIN GAME PROJECT</span><h2>DIAMOND RISE: ROOKIE</h2><p>무명 신인에서 리그를 대표하는 선수로 성장하는 야구 커리어 게임.</p></div>
            <span className="umbrella-meta">UNITY 6 <i /> LOCAL STUDIO</span>
          </section>

          {activeDirective ? (
            <>
              <section className="review-project-bar directive-bar">
                <div className="review-project-meta"><span className="section-kicker">DIRECTOR INSTRUCTION</span><span className={`project-state ${activeDirective.status.toLowerCase()}`}>{activeDirective.status === 'PENDING_APPROVAL' ? '검토 중' : activeDirective.status === 'APPROVED' ? '승인 기록' : '반려'}</span></div>
                <div className="review-project-heading">
                  <div><h2>{activeDirective.title}</h2><p>{activeDirective.description}</p></div>
                  <label className="project-picker-label"><span>지시사항 선택</span><select aria-label="검토할 디렉터 지시 선택" value={activeDirective.id} onChange={(event) => setActiveDirectiveId(event.target.value)}>{requests.map((request) => <option key={request.id} value={request.id}>{request.title}</option>)}</select></label>
                </div>
              </section>

              <section className="magi-review" aria-label="디렉터 지시에 대한 부서 의견">
                <div className="magi-heading"><div><span className="section-kicker">THREE INDEPENDENT PERSPECTIVES</span><h2>부서별 검토 의견</h2></div><span className="magi-count">01 <i /> 02 <i /> 03</span></div>
                <div className="opinion-grid">
                  {departments.filter((department) => department.name !== 'QA팀').map((department, index) => {
                    const opinion = activeDirective.opinions?.find((item) => item.team === department.name);
                    const ready = Boolean(opinion);
                    return (
                      <article className={`opinion-card ${department.className}`} key={department.name}>
                        <div className="opinion-card-top"><span className="opinion-index">0{index + 1}</span><span className={`opinion-state ${ready ? 'complete' : ''}`}><i />{ready ? '검토 완료' : '의견 대기'}</span></div>
                        <div className="opinion-team"><div className={`department-avatar ${department.className}`}>{department.initials}</div><div><h3>{department.name}</h3><span>{department.role}</span></div></div>
                        <div className={`opinion-copy ${ready ? '' : 'empty-opinion'}`}>{opinion ? <OpinionText content={opinion.content} /> : <><Sparkles size={18} /><p>이 지시를 검토하면<br />부서 의견이 여기에 표시됩니다.</p></>}</div>
                        <div className="opinion-card-foot"><span>{opinion?.model ?? 'LOCAL AGENT'}</span><span>{ready ? '개별 의견' : '대기 중'}</span></div>
                      </article>
                    );
                  })}
                </div>

                <div className="director-dock">
                  <div className="dock-copy"><span className="dock-indicator"><i /></span><div><strong>{activeDirective.opinions?.length === 3 ? '세 부서 의견을 모두 확인했습니다' : '디렉터 검토 대기'}</strong><span>{activeDirective.opinions?.length === 3 ? '의견을 비교한 뒤 이 지시의 다음 단계를 결정하세요.' : '부서 의견 생성은 로컬 모델에서 차례로 진행됩니다.'}</span></div></div>
                  <div className="dock-actions">
                    <button className="generate-plan-button" disabled={busy || activeDirective.status !== 'PENDING_APPROVAL'} onClick={() => requestDepartmentOpinions(activeDirective.id)} type="button"><Sparkles size={14} />{busy ? '세 부서 검토 중…' : activeDirective.opinions?.length === 3 ? '의견 다시 받기' : '세 부서 의견 받기'}</button>
                    <button className="reject-button" disabled={busy || activeDirective.status !== 'PENDING_APPROVAL'} onClick={() => decideRequest(activeDirective.id, false)} type="button">반려</button>
                    <button className="approve-button" disabled={busy || activeDirective.status !== 'PENDING_APPROVAL' || activeDirective.opinions?.length !== 3} onClick={() => decideRequest(activeDirective.id, true)} type="button"><Check size={14} /> 승인 기록</button>
                  </div>
                </div>
              </section>

              <section className="project-history directive-history">
                <div className="history-heading"><span className="section-kicker">DIRECTOR'S INSTRUCTIONS</span><span>이 게임의 지시 {requests.length}건</span></div>
                <div className="history-list">{requests.slice(0, 5).map((request) => <button className={`history-item ${request.id === activeDirective.id ? 'selected' : ''}`} key={request.id} onClick={() => setActiveDirectiveId(request.id)} type="button"><span className="history-dot" /><span className="history-title">{request.title}</span><span className="history-status">{request.opinions?.length === 3 ? '의견 완료' : request.status === 'PENDING_APPROVAL' ? '검토 대기' : request.status === 'APPROVED' ? '승인' : '반려'}</span></button>)}</div>
              </section>
            </>
          ) : (
            <section className="review-empty"><div className="empty-magi"><span>DR</span><i /><i /><i /></div><span className="section-kicker">DIRECTOR'S DESK</span><h2>첫 디렉터 지시를 등록해 보세요</h2><p>DIAMOND RISE 프로젝트 안에 지시사항을 만들면 세 부서가 각각 의견을 작성합니다.</p><button className="primary-button" onClick={() => setShowRequestForm(true)} type="button"><Plus size={15} /> 첫 지시 등록</button></section>
          )}
        </div>
      </main>

      {showApprovalInfo && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowApprovalInfo(false)}>
          <section className="approval-modal" role="dialog" aria-modal="true" aria-labelledby="approval-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="닫기" type="button" onClick={() => setShowApprovalInfo(false)}>×</button>
            <div className="modal-icon"><ShieldCheck size={22} /></div>
            <span className="section-kicker">YOUR APPROVAL, ALWAYS</span>
            <h2 id="approval-title">최종 결정권은 디렉터에게 있습니다.</h2>
            <p>DIAMOND RISE라는 하나의 게임 프로젝트 안에 디렉터 지시를 등록합니다. 기획·개발·아트팀이 각 지시를 검토해 의견을 내고, 디렉터가 지시별 승인 또는 반려를 기록합니다. 승인 기록은 상태만 바꾸며 게임 파일은 변경하지 않습니다.</p>
            <div className="approval-steps"><span>요청</span><i /> <span>계획</span><i /> <strong>승인</strong><i /> <span>실행</span></div>
            <button className="primary-button modal-done" type="button" onClick={() => setShowApprovalInfo(false)}>확인 <Check size={16} /></button>
          </section>
        </div>
      )}

      {showRequestForm && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowRequestForm(false)}>
          <section className="approval-modal request-modal" role="dialog" aria-modal="true" aria-labelledby="request-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="닫기" type="button" onClick={() => setShowRequestForm(false)}><X size={19} /></button>
            <div className="modal-icon"><Plus size={21} /></div>
            <span className="section-kicker">NEW DIRECTOR INSTRUCTION</span>
            <h2 id="request-title">프로젝트에 어떤 지시를 내릴까요?</h2>
            <p>이 지시는 DIAMOND RISE 게임 프로젝트 안에 저장되고 세 부서가 함께 검토합니다.</p>
            <form className="request-form" onSubmit={submitRequest}>
              <label>지시 제목<input required maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="예: 선수 성장 시스템 구축" /></label>
              <label>디렉터 지시<textarea required maxLength={4000} rows={5} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="원하는 결과, 규칙, 참고할 내용을 설명해 주세요." /></label>
              {notice && <div className="inline-error" role="alert">{notice}</div>}
              <div className="form-actions"><button className="text-button" onClick={() => setShowRequestForm(false)} type="button">취소</button><button className="primary-button" disabled={busy} type="submit">{busy ? '저장 중…' : '지시 등록'} <ArrowRight size={15} /></button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function OpinionText({ content }: { content: string }) {
  const inline = (text: string) => text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });

  const blocks = content.replace(/\r/g, '').split(/\n\s*\n/).map((block) => block.trim()).filter((block) => block && !/^---+$/.test(block));
  return <div className="opinion-formatted">{blocks.map((block, index) => {
    const lines = block.split('\n').filter((line) => !/^\s*---+\s*$/.test(line));
    const first = lines[0]?.trim() ?? '';
    const heading = /^\*\*(.+)\*\*$/.exec(first)?.[1] ?? /^(#{1,4})\s+(.+)$/.exec(first)?.[2];
    const body = heading ? lines.slice(1) : lines;
    return <section className="opinion-section" key={index}>
      {heading && <h4>{inline(heading)}</h4>}
      {body.map((line, lineIndex) => {
        const listItem = /^\s*(?:[-*]|\d+[.)])\s+(.+)$/.exec(line);
        return listItem
          ? <div className="opinion-list-line" key={lineIndex}><i />{inline(listItem[1])}</div>
          : line.trim() && <p key={lineIndex}>{inline(line.replace(/^\s*#{1,4}\s+/, ''))}</p>;
      })}
    </section>;
  })}</div>;
}

export default App;
