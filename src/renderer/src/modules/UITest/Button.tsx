import { Plus } from 'lucide-react';
import { Button } from '@renderer/components/ui/Button';

interface Variant {
  name: string;
  description: string;
  className: string;
}

interface Group {
  title: string;
  description: string;
  variants: Variant[];
}

const GROUPS: Group[] = [
  {
    title: 'Solid',
    description: 'Nền primary đặc, chữ text-primary',
    variants: [
      {
        name: 'solid',
        description: 'Hành động chính, nổi bật nhất',
        className: 'bg-primary text-text-primary hover:bg-primary/90 active:bg-primary/80',
      },
    ],
  },
  {
    title: 'Soft',
    description: 'Nền giảm opacity, chữ giữ nguyên màu (primary, riêng cancel dùng text-secondary)',
    variants: [
      {
        name: 'soft',
        description: 'Không viền, nhẹ nhàng',
        className: 'bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30',
      },
      {
        name: 'cancel',
        description: 'Soft dùng text-secondary, cho Cancel, đóng, quay lại (dùng rất nhiều nên có tên riêng)',
        className:
          'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30',
      },
      {
        name: 'soft-outline-solid',
        description: 'Soft kèm viền liền',
        className:
          'border border-solid border-primary bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30',
      },
      {
        name: 'soft-outline-dashed',
        description: 'Soft kèm viền đứt nét',
        className:
          'border border-dashed border-primary bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30',
      },
    ],
  },
  {
    title: 'Outline',
    description: 'Trong suốt, chữ và viền đều là primary',
    variants: [
      {
        name: 'outline-solid',
        description: 'Viền liền',
        className:
          'border border-solid border-primary bg-transparent text-primary hover:bg-primary/10 active:bg-primary/20',
      },
      {
        name: 'outline-dashed',
        description: 'Viền đứt nét',
        className:
          'border border-dashed border-primary bg-transparent text-primary hover:bg-primary/10 active:bg-primary/20',
      },
    ],
  },
];

const TOTAL = GROUPS.reduce((sum, group) => sum + group.variants.length, 0);

export default function ButtonTab() {
  let index = 0;

  return (
    <div className='overflow-hidden rounded-xl border border-border bg-card-background'>
      <div className='flex items-center justify-between border-b border-divider px-5 py-3'>
        <div className='flex flex-col'>
          <h2 className='text-sm font-semibold text-text-primary'>Button variants</h2>
          <p className='text-xs text-text-secondary'>Mặc định, có icon và disabled của từng biến thể</p>
        </div>
        <span className='rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] text-primary'>
          {TOTAL} variants
        </span>
      </div>

      <table className='w-full border-collapse text-sm'>
        <thead>
          <tr className='bg-background/60 text-left text-[10px] font-semibold uppercase tracking-widest text-text-secondary'>
            <th className='w-20 px-5 py-2.5'>STT</th>
            <th className='w-80 px-5 py-2.5'>Tên</th>
            <th className='px-5 py-2.5'>UI</th>
          </tr>
        </thead>
        {GROUPS.map((group) => (
          <tbody key={group.title}>
            <tr className='border-y border-divider bg-background/40'>
              <td colSpan={3} className='px-5 py-2'>
                <div className='flex items-baseline gap-3'>
                  <span className='text-[11px] font-semibold uppercase tracking-widest text-primary'>
                    {group.title}
                  </span>
                  <span className='text-xs text-text-secondary'>{group.description}</span>
                </div>
              </td>
            </tr>
            {group.variants.map((variant) => {
              index += 1;
              return (
                <tr
                  key={variant.name}
                  className='border-b border-divider transition-colors last:border-b-0 hover:bg-card-hover'
                >
                  <td className='px-5 py-4 align-middle font-mono text-xs tabular-nums text-text-secondary'>
                    {String(index).padStart(2, '0')}
                  </td>
                  <td className='px-5 py-4 align-middle'>
                    <div className='flex flex-col gap-0.5'>
                      <span className='font-mono text-xs font-medium text-text-primary'>
                        {variant.name}
                      </span>
                      <span className='text-[11px] text-text-secondary'>{variant.description}</span>
                    </div>
                  </td>
                  <td className='px-5 py-4 align-middle'>
                    <div className='flex flex-wrap items-center gap-3'>
                      <Button className={variant.className}>Button</Button>
                      <Button className={variant.className}>
                        <Plus className='h-3.5 w-3.5' />
                        Button
                      </Button>
                      <Button className={variant.className} disabled>
                        Disabled
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}