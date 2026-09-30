// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MobileSidebarToggle } from './mobile-sidebar';
import { useIsInstalled } from '@/hooks/usePWA';
import { GeofenceDrawingMap } from '@/components/geofencing/GeofenceDrawingMap';
import { LocaleProvider, useLocale } from '@/components/i18n/LocaleProvider';

let pathname = '/dashboard';
vi.mock('next/dynamic', () => ({ default: () => ({ children }: { children?: React.ReactNode }) => children ?? null }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  pathname = '/dashboard';
});

describe('browser lifecycle regressions', () => {
  it('resets drawing geometry when modes change without discarding radius preferences', () => {
    const notify = vi.fn();
    const view = render(<GeofenceDrawingMap drawingMode="circle" onGeometryChange={notify} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '750' } });
    view.rerender(<GeofenceDrawingMap drawingMode="corridor" onGeometryChange={notify} />);
    view.rerender(<GeofenceDrawingMap drawingMode="circle" onGeometryChange={notify} />);
    expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('750');
    expect(notify.mock.calls).toEqual([[null], [null], [null]]);
  });

  it('closes navigation on a route change and releases the body scroll lock', () => {
    const view = render(<MobileSidebarToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(document.body.style.overflow).toBe('hidden');
    pathname = '/cases';
    view.rerender(<MobileSidebarToggle />);
    expect(document.body.style.overflow).toBe('');
    expect(screen.queryByRole('button', { name: 'Close navigation menu' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
  });

  it('reads standalone mode, follows changes, and unsubscribes on unmount', () => {
    let standalone = true;
    let listener: (() => void) | undefined;
    const remove = vi.fn();
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      get matches() { return standalone; },
      addEventListener: (_: string, callback: () => void) => { listener = callback; },
      removeEventListener: remove,
    })));
    const view = renderHook(() => useIsInstalled());
    expect(view.result.current).toBe(true);
    act(() => { standalone = false; listener?.(); });
    expect(view.result.current).toBe(false);
    view.unmount();
    expect(remove).toHaveBeenCalledWith('change', listener);
  });

  it('uses stored locale without fetching a profile and follows storage changes', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    localStorage.setItem('locateconnect.locale', 'fr');
    function CurrentLocale() { const { locale } = useLocale(); return <span>{locale}</span>; }
    const view = render(<LocaleProvider><CurrentLocale /></LocaleProvider>);
    expect(screen.getByText('fr')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    act(() => {
      localStorage.setItem('locateconnect.locale', 'en');
      window.dispatchEvent(new StorageEvent('storage', { key: 'locateconnect.locale' }));
    });
    expect(screen.getByText('en')).toBeTruthy();
    view.unmount();
  });
});
