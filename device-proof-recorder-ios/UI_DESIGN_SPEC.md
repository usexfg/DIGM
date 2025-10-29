# DIGM ◉rigins UI Design Specification

## Main Screen Design

### Layout: Camera App Style

**Inspiration**: iOS Camera app - clean, minimal, focused on the record button

### Key Elements

1. **ivory Background**: Full-screen ivory background
2. **US Dime-Sized Button**: Exact dime dimensions at bottom
3. **Minimal UI**: No clutter, only essential elements
4. **Dark Mode**: Always on black background

---

## Button Specifications

### US Dime Dimensions

**Real World**: 17.91mm diameter  
**In Points**: 51 points (at 72 DPI)  
**Consistent**: Same physical size on all devices

### Button States

#### Idle State (White)
- Outer circle: White fill
- Inner indicator: Small red circle
- Ring: Subtle white glow (10% opacity)

#### Recording State (Red)
- Outer circle: Red fill
- Inner indicator: White square
- Ring: Animated white glow (30% opacity, pulsing)

---

## Screen Layout

```
┌─────────────────────────────┐
│                        ⚫    │ <- Top indicator
│                             │
│                             │
│                             │
│                             │
│                             │
│                             │
│        MM:SS               │ <- Duration (when recording)
│                             │
│          ┌──┐              │
│          │◉ │  <- Dime     │ <- 50pt padding from bottom
│          └──┘    button    │
│    Size: 2.3 MB            │ <- File size (when recording)
│                             │
└─────────────────────────────┘
```

---

## UI Elements

### Top Indicator
- Position: Top right
- Size: 10pt circle
- Color: Red (recording, pulsing) / Gray (idle)

### Duration Display
- Position: Above button
- Font: 32pt, medium weight, monospaced
- Color: White
- Format: MM:SS

### File Size Display
- Position: Below button
- Font: Caption (10pt)
- Color: Gray
- Format: "Size: X.X MB"

---

## Color Palette

### Background
- Primary: Pure black (#000000)

### Button (Idle)
- Main: White (#FFFFFF)
- Indicator: Red (#E61919)
- Ring: White 10% opacity

### Button (Recording)
- Main: Red (#FF0000)
- Indicator: White (#FFFFFF)
- Ring: White 30% opacity (pulsing)

### Text
- Primary: White (#FFFFFF)
- Secondary: Gray (#808080)

---

## Animations

- Button press: Scale to 0.95x
- State change: 0.3s ease-in-out
- Recording indicator: Pulsing scale
- Ring pulse: Opacity and blur animation

---

## Navigation

**Top Bar**:
- Left: Recordings list icon
- Right: Settings icon
- Style: White icons on transparent background

**Bottom Bar**: Nothing - just the button

---

**Design Philosophy**: Minimal, focused, premium - like the camera app, but for audio.

