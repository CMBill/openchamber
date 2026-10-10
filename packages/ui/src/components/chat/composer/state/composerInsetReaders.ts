/**
 * Publishes the floating composer's insets onto the elements that read them.
 *
 * `--chat-composer-inset` (the slot's height, read by the transcript's end
 * fade band) and `--chat-composer-tail-inset` (read by the list footer's tail
 * spacer) change with every composer line. Written on the chat column, they
 * inherited into the whole transcript, and each change restyled every element
 * of it (about 50,000 in a long session, 60-90 ms per new composer line). The
 * readers are leaves, so the values are written on them directly: a reader
 * registers when it mounts and gets the column's current values at once,
 * and the column's observer updates the registered readers inside it.
 */

interface ComposerInsets {
    /** The composer slot's height, px. */
    readonly inset: number;
    /** The band the list footer reserves for the composer, px. */
    readonly tailInset: number;
}

const COLUMN_ATTRIBUTE = 'data-composer-inset-column';

const readers = new Set<HTMLElement>();
const publishedByColumn = new WeakMap<HTMLElement, ComposerInsets>();

const setPx = (element: HTMLElement, property: string, px: number | null) => {
    if (px === null) {
        element.style.removeProperty(property);
        return;
    }
    const value = `${px}px`;
    if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value);
};

const applyInsets = (reader: HTMLElement, insets: ComposerInsets | null) => {
    setPx(reader, '--chat-composer-inset', insets?.inset ?? null);
    setPx(reader, '--chat-composer-tail-inset', insets?.tailInset ?? null);
};

/**
 * Registers an element that reads the composer insets (use as a ref
 * callback). Until its column publishes, the reader keeps its CSS fallbacks.
 */
export const registerComposerInsetReader = (reader: HTMLElement | null): (() => void) | undefined => {
    if (!reader) return undefined;
    readers.add(reader);
    const column = reader.closest<HTMLElement>(`[${COLUMN_ATTRIBUTE}]`);
    applyInsets(reader, column ? publishedByColumn.get(column) ?? null : null);
    return () => {
        readers.delete(reader);
    };
};

/** The column's composer measured these insets; its readers take them. */
export const publishComposerInsets = (column: HTMLElement, insets: ComposerInsets): void => {
    column.setAttribute(COLUMN_ATTRIBUTE, '');
    publishedByColumn.set(column, insets);
    for (const reader of readers) {
        if (column.contains(reader)) applyInsets(reader, insets);
    }
};

/** The column's composer stopped floating: its readers fall back to CSS. */
export const withdrawComposerInsets = (column: HTMLElement): void => {
    column.removeAttribute(COLUMN_ATTRIBUTE);
    publishedByColumn.delete(column);
    for (const reader of readers) {
        if (column.contains(reader)) applyInsets(reader, null);
    }
};
