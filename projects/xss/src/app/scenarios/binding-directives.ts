import {
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

export const TONES = ['info', 'warning', 'danger'] as const;
export type Tone = (typeof TONES)[number];

export const TONE_COLOR: Record<Tone, string> = {
  info: '#4f46e5',
  warning: '#d97706',
  danger: '#e11d48',
};

@Directive({
  selector: '[labElementRef]',
  standalone: true,
  exportAs: 'labElementRef',
})
export class ElementRefDirective {
  readonly tone = input<Tone>('info', { alias: 'labElementRefTone' });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    const onClick = () => this.toggle();
    this.host.addEventListener('click', onClick);
    inject(DestroyRef).onDestroy(() => this.host.removeEventListener('click', onClick));
    effect(() => this.paint(this.tone()));
  }

  toggle(): void {
    const active = this.host.classList.toggle('is-active');
    this.host.setAttribute('aria-pressed', String(active));
  }

  paint(tone: Tone): void {
    this.host.dataset['tone'] = tone;
    this.host.style.borderColor = TONE_COLOR[tone];
  }

  // Celowo podatny sink: innerHTML omija sanityzację Angulara.
  writeHtml(html: string): void {
    this.host.innerHTML = html;
  }

  writeText(text: string): void {
    this.host.textContent = text;
  }
}

// host: {
//   '[innerHTML]':'"test <div id=test > Sanitized </div>" ' // Angular satnitized
// }

@Directive({
  selector: '[labHostBindings]',
  standalone: true,
  exportAs: 'labHostBindings',
  host: {
    role: 'button',
    tabindex: '0',
    '[class.is-active]': 'active()',
    '[attr.aria-pressed]': 'active()',
    '[attr.data-tone]': 'tone()',
    '[style.border-color]': 'toneColor()',
    '(click)': 'toggle()',
    '(keydown.enter)': 'toggle()',
  },
})
export class HostBindingsDirective {
  readonly tone = input<Tone>('info', { alias: 'labHostBindingsTone' });
  readonly active = signal(false);
  readonly toneColor = computed(() => TONE_COLOR[this.tone()]);

  toggle(): void {
    this.active.update((value) => !value);
  }
}
