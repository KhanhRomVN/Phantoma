import { useState } from 'react';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import { CANCEL_BUTTON_CLASS, Field, Panel, Segmented, Toggle } from './shared';

type Kind = 'playground' | 'confirm' | 'form' | 'wizard' | 'long' | 'blocking';

const WIDTHS = ['max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-2xl'];
const STEPS = ['Account', 'Plan', 'Confirm'];

const SCENARIOS: { kind: Kind; title: string; description: string; props: string }[] = [
  {
    kind: 'confirm',
    title: 'Confirm delete',
    description: 'Hộp thoại xác nhận ngắn, 2 nút ở footer',
    props: 'ModalHeader + ModalBody + ModalFooter',
  },
  {
    kind: 'form',
    title: 'Create group',
    description: 'Form có Input, nút Create bị disabled khi chưa nhập',
    props: 'Input + Button disabled',
  },
  {
    kind: 'wizard',
    title: 'Wizard 3 bước',
    description: 'Điều hướng Back / Next trong cùng một Modal',
    props: 'state step + ModalHeader description',
  },
  {
    kind: 'long',
    title: 'Nội dung dài',
    description: 'ModalBody cuộn khi vượt chiều cao',
    props: 'className max-h-[70vh] flex flex-col',
  },
  {
    kind: 'blocking',
    title: 'Blocking modal',
    description: 'Không đóng bằng backdrop, không có nút X',
    props: 'closeOnBackdropClick=false, showCloseButton=false',
  },
];

export default function ModalTab() {
  const [open, setOpen] = useState<Kind | null>(null);
  const [backdrop, setBackdrop] = useState(true);
  const [closeButton, setCloseButton] = useState(true);
  const [width, setWidth] = useState('max-w-md');
  const [name, setName] = useState('');
  const [step, setStep] = useState(0);

  const close = () => {
    setOpen(null);
    setStep(0);
    setName('');
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel title="Playground" description="isOpen, onClose, className, closeOnBackdropClick">
        <div className="flex flex-col gap-4">
          <Field label="className (width)">
            <Segmented value={width} options={WIDTHS} onChange={setWidth} />
          </Field>
          <Field label="props">
            <div className="flex flex-col gap-2">
              <Toggle label="closeOnBackdropClick" checked={backdrop} onChange={setBackdrop} />
              <Toggle label="ModalHeader showCloseButton" checked={closeButton} onChange={setCloseButton} />
            </div>
          </Field>
          <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={() => setOpen('playground')}>
            Open playground modal
          </Button>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {SCENARIOS.map((item) => (
          <Panel key={item.kind} title={item.title} description={item.description}>
            <div className="flex h-full flex-col justify-between gap-4">
              <code className="font-mono text-[11px] text-text-secondary">{item.props}</code>
              <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={() => setOpen(item.kind)}>
                Open
              </Button>
            </div>
          </Panel>
        ))}
      </div>

      <Modal
        isOpen={open === 'playground'}
        onClose={close}
        closeOnBackdropClick={backdrop}
        className={width}
      >
        <ModalHeader
          title="Playground modal"
          description={`className=${width}`}
          onClose={close}
          showCloseButton={closeButton}
        />
        <ModalBody>
          <p className="text-sm text-text-primary">Thử bật/tắt các props ở bên trái rồi mở lại.</p>
        </ModalBody>
        <ModalFooter>
          <Button className={CANCEL_BUTTON_CLASS} onClick={close}>
            Cancel
          </Button>
          <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={close}>
            Confirm
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={open === 'confirm'} onClose={close} className="max-w-sm">
        <ModalHeader title="Delete project?" onClose={close} />
        <ModalBody>
          <p className="text-sm text-text-secondary">Hành động này không thể hoàn tác.</p>
        </ModalBody>
        <ModalFooter>
          <Button className={CANCEL_BUTTON_CLASS} onClick={close}>
            Cancel
          </Button>
          <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={close}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={open === 'form'} onClose={close} className="max-w-md">
        <ModalHeader title="Create group" description="Đặt tên cho nhóm mới" onClose={close} />
        <ModalBody>
          <Input
            label="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My group"
          />
        </ModalBody>
        <ModalFooter>
          <Button className={CANCEL_BUTTON_CLASS} onClick={close}>
            Cancel
          </Button>
          <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" disabled={!name.trim()} onClick={close}>
            Create group
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={open === 'wizard'} onClose={close} className="max-w-lg">
        <ModalHeader
          title={`Bước ${step + 1}: ${STEPS[step]}`}
          description={`${step + 1} / ${STEPS.length}`}
          onClose={close}
        />
        <ModalBody>
          <div className="mb-3 flex gap-1">
            {STEPS.map((item, index) => (
              <div
                key={item}
                className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-primary' : 'bg-background'}`}
              />
            ))}
          </div>
          <p className="text-sm text-text-primary">Nội dung của bước {STEPS[step]}.</p>
        </ModalBody>
        <ModalFooter>
          <Button
            className={CANCEL_BUTTON_CLASS}
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
          <Button
            className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70"
            onClick={() => (step === STEPS.length - 1 ? close() : setStep((s) => s + 1))}
          >
            {step === STEPS.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={open === 'long'} onClose={close} className="max-h-[70vh] max-w-lg flex flex-col">
        <ModalHeader title="Terms of service" onClose={close} />
        <ModalBody>
          {Array.from({ length: 24 }, (_, index) => (
            <p key={index} className="mb-3 text-sm text-text-secondary">
              {index + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
              tempor incididunt ut labore et dolore magna aliqua.
            </p>
          ))}
        </ModalBody>
        <ModalFooter>
          <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={close}>
            I agree
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={open === 'blocking'}
        onClose={close}
        closeOnBackdropClick={false}
        className="max-w-sm"
      >
        <ModalHeader title="Session expired" onClose={close} showCloseButton={false} />
        <ModalBody>
          <p className="text-sm text-text-secondary">Bạn phải chọn một hành động để tiếp tục.</p>
        </ModalBody>
        <ModalFooter>
          <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={close}>
            Sign in again
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}