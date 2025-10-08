import styles from './Loader.module.css';

type LoaderProps = {
    size?: number; // in pixels
    color?: 'primary' | 'white' | 'black' | string; // string allows hex/rgb/custom
};

export default function Loader({ size = 36, color = 'primary' }: LoaderProps) {
    // Map color keywords to actual values
    const colorMap: Record<string, string> = {
        primary: 'var(--color-primary)',
        white: '#ffffff',
        black: '#000000',
    };

    const spinnerColor = colorMap[color] || color; // use custom string if not keyword

    return (
        <div
            className={styles.spinner}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                borderTopColor: spinnerColor,
            }}
        />
    );
}
