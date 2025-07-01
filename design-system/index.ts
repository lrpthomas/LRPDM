// design-system/index.ts - Professional GIS Design System
// Zero cost - using system fonts and CSS variables

export const theme = {
  // Professional color palette - no childish colors
  colors: {
    // Primary - Professional blue
    primary: {
      50: 'hsl(210, 100%, 96%)',
      100: 'hsl(210, 100%, 92%)',
      200: 'hsl(210, 100%, 84%)',
      300: 'hsl(210, 100%, 72%)',
      400: 'hsl(210, 100%, 56%)',
      500: 'hsl(210, 100%, 40%)', // Main brand
      600: 'hsl(210, 100%, 32%)',
      700: 'hsl(210, 100%, 24%)',
      800: 'hsl(210, 100%, 16%)',
      900: 'hsl(210, 100%, 8%)',
    },
    
    // Semantic colors - data-focused
    semantic: {
      success: 'hsl(142, 71%, 45%)',
      warning: 'hsl(38, 92%, 50%)',
      error: 'hsl(0, 84%, 60%)',
      info: 'hsl(201, 90%, 47%)',
    },
    
    // Neutral - true grays for data
    gray: {
      50: 'hsl(0, 0%, 98%)',
      100: 'hsl(0, 0%, 96%)',
      200: 'hsl(0, 0%, 92%)',
      300: 'hsl(0, 0%, 84%)',
      400: 'hsl(0, 0%, 64%)',
      500: 'hsl(0, 0%, 44%)',
      600: 'hsl(0, 0%, 32%)',
      700: 'hsl(0, 0%, 20%)',
      800: 'hsl(0, 0%, 12%)',
      900: 'hsl(0, 0%, 4%)',
    }
  },
  
  // Professional typography - system fonts (free)
  fonts: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", monospace',
  },
  
  // Type scale
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  
  // Professional spacing (8pt grid)
  space: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
  },
  
  // Radii - subtle, not playful
  radii: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  
  // Professional shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  
  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  }
};

// CSS Variables for runtime theming
export const cssVariables = `
:root {
  /* Colors */
  --color-primary: ${theme.colors.primary[500]};
  --color-primary-hover: ${theme.colors.primary[600]};
  --color-success: ${theme.colors.semantic.success};
  --color-warning: ${theme.colors.semantic.warning};
  --color-error: ${theme.colors.semantic.error};
  
  /* Typography */
  --font-sans: ${theme.fonts.sans};
  --font-mono: ${theme.fonts.mono};
  
  /* Spacing */
  --space-1: ${theme.space[1]};
  --space-2: ${theme.space[2]};
  --space-3: ${theme.space[3]};
  --space-4: ${theme.space[4]};
  
  /* Professional transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;
  
  /* Data visualization colors */
  --chart-1: hsl(210, 100%, 40%);
  --chart-2: hsl(160, 60%, 40%);
  --chart-3: hsl(30, 100%, 50%);
  --chart-4: hsl(280, 60%, 50%);
  --chart-5: hsl(340, 75%, 50%);
}

/* Dark mode - professional, not trendy */
[data-theme="dark"] {
  --color-bg: ${theme.colors.gray[900]};
  --color-text: ${theme.colors.gray[50]};
  --color-border: ${theme.colors.gray[700]};
}
`;

// Utility classes for consistent styling
export const utils = {
  // Professional focus styles
  focusRing: `
    outline: 2px solid transparent;
    outline-offset: 2px;
    &:focus-visible {
      outline-color: var(--color-primary);
    }
  `,
  
  // Data table styles
  dataCell: `
    padding: ${theme.space[2]} ${theme.space[3]};
    border-bottom: 1px solid ${theme.colors.gray[200]};
    font-size: ${theme.fontSizes.sm};
  `,
  
  // Professional button
  button: {
    base: `
      font-family: ${theme.fonts.sans};
      font-weight: 500;
      border-radius: ${theme.radii.md};
      transition: all var(--transition-fast);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: ${theme.space[2]};
    `,
    
    primary: `
      background: var(--color-primary);
      color: white;
      &:hover {
        background: var(--color-primary-hover);
      }
    `,
    
    ghost: `
      background: transparent;
      color: ${theme.colors.gray[700]};
      &:hover {
        background: ${theme.colors.gray[100]};
      }
    `
  }
};

// Export Tailwind config for consistency
export const tailwindConfig = {
  theme: {
    extend: {
      colors: theme.colors,
      fontFamily: {
        sans: theme.fonts.sans.split(','),
        mono: theme.fonts.mono.split(','),
      },
      spacing: theme.space,
      borderRadius: theme.radii,
      boxShadow: theme.shadows,
      zIndex: theme.zIndex,
    }
  }
};