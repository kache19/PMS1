export async function runWithPreservedWindowScroll<T>(task: () => Promise<T> | T): Promise<T> {
  if (typeof window === 'undefined') {
    return await task();
  }

  const scrollContainer = document.getElementById('app-main-scroll') as HTMLElement | null;
  const hasContainerScroll = Boolean(
    scrollContainer &&
    (scrollContainer.scrollHeight > scrollContainer.clientHeight || scrollContainer.scrollTop > 0)
  );

  const startX = hasContainerScroll ? (scrollContainer as HTMLElement).scrollLeft : window.scrollX;
  const startY = hasContainerScroll ? (scrollContainer as HTMLElement).scrollTop : window.scrollY;
  let userInteracted = false;

  const markInteraction = () => {
    userInteracted = true;
  };

  const keyHandler = (event: KeyboardEvent) => {
    const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
    if (keys.includes(event.key)) {
      userInteracted = true;
    }
  };

  window.addEventListener('wheel', markInteraction, { passive: true });
  window.addEventListener('touchmove', markInteraction, { passive: true });
  window.addEventListener('keydown', keyHandler);

  try {
    const result = await task();
    if (!userInteracted) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (hasContainerScroll && scrollContainer) {
        const previousBehavior = scrollContainer.style.scrollBehavior;
        scrollContainer.style.scrollBehavior = 'auto';
        scrollContainer.scrollTo(startX, startY);
        scrollContainer.style.scrollBehavior = previousBehavior;
      } else {
        window.scrollTo(startX, startY);
      }
    }
    return result;
  } finally {
    window.removeEventListener('wheel', markInteraction);
    window.removeEventListener('touchmove', markInteraction);
    window.removeEventListener('keydown', keyHandler);
  }
}
