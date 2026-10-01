import { Modal } from "./Modal";
export function TemplateChoice({
  title,
  onChoose,
  onClose,
}: {
  title: string;
  onChoose: (template: boolean) => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="muted">
        대역을 정의하고 장비를 배치하세요. 변경 사항은 이 브라우저에 자동
        저장됩니다.
      </p>
      <div className="template-choices">
        <button onClick={() => onChoose(true)}>
          <strong>기본 골격</strong>
          <span>
            인터넷 → 방화벽 → 라우터 → 코어 스위치
            <br />
            사무망 · 서버망 포함
          </span>
        </button>
        <button onClick={() => onChoose(false)}>
          <strong>빈 캔버스</strong>
          <span>
            대역과 장비를 직접 구성합니다.
            <br />
            타이틀 블록 · 범례 자동 생성
          </span>
        </button>
      </div>
    </Modal>
  );
}
