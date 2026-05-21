import 'dart:ui';
import 'package:flutter/material.dart';
import 'digm_theme.dart';

class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double blurSigma;
  final Color? backgroundColor;
  final Color? borderColor;
  final double? borderRadius;
  final double? width;

  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.blurSigma = 10.0,
    this.backgroundColor,
    this.borderColor,
    this.borderRadius,
    this.width,
  });

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? DigmTheme.borderRadius;
    final bg = backgroundColor ?? DigmTheme.glassBg;
    final border = borderColor ?? DigmTheme.glassBorder;

    return Container(
      width: width,
      margin: margin,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(radius),
              border: Border.all(color: border, width: 1),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

class GlassButton extends StatefulWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final Color? backgroundColor;
  final double? borderRadius;
  final EdgeInsetsGeometry? padding;

  const GlassButton({
    super.key,
    required this.child,
    this.onPressed,
    this.backgroundColor,
    this.borderRadius,
    this.padding = const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
  });

  @override
  State<GlassButton> createState() => _GlassButtonState();
}

class _GlassButtonState extends State<GlassButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.97).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bg = widget.backgroundColor ?? DigmTheme.fuchsia;

    return GestureDetector(
      onTapDown: widget.onPressed != null ? (_) {
        setState(() => _isPressed = true);
        _controller.forward();
      } : null,
      onTapUp: widget.onPressed != null ? (_) {
        setState(() => _isPressed = false);
        _controller.reverse();
        widget.onPressed?.call();
      } : null,
      onTapCancel: () {
        setState(() => _isPressed = false);
        _controller.reverse();
      },
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) => Transform.scale(
          scale: _scaleAnimation.value,
          child: Container(
            padding: widget.padding,
            decoration: BoxDecoration(
              color: _isPressed ? DigmTheme.fuchsia700 : bg,
              borderRadius: BorderRadius.circular(
                  widget.borderRadius ?? (DigmTheme.borderRadius * 2)),
              boxShadow: [
                BoxShadow(
                  color: bg.withValues(alpha: 0.25),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: DefaultTextStyle(
              style: const TextStyle(
                fontFamily: 'Inter',
                fontWeight: FontWeight.bold,
                color: DigmTheme.textPrimary,
              ),
              child: widget.child,
            ),
          ),
        ),
      ),
    );
  }
}

class GradientText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final LinearGradient gradient;
  final TextAlign? textAlign;

  const GradientText(
    this.text, {
    super.key,
    this.style,
    this.gradient = DigmTheme.textGradient,
    this.textAlign,
  });

  factory GradientText.queen(String text, {TextStyle? style}) =>
      GradientText(text,
          style: style, gradient: DigmTheme.textGradientQueen);

  factory GradientText.sky(String text, {TextStyle? style}) =>
      GradientText(text, style: style, gradient: DigmTheme.textGradientSky);

  factory GradientText.gold(String text, {TextStyle? style}) =>
      GradientText(text, style: style, gradient: DigmTheme.textGradientGold);

  factory GradientText.mixed(String text, {TextStyle? style}) =>
      GradientText(text,
          style: style, gradient: DigmTheme.textGradientMixed);

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (bounds) => gradient.createShader(bounds),
      child: Text(
        text,
        textAlign: textAlign,
        style: (style ?? const TextStyle())
            .copyWith(color: Colors.white, fontWeight: FontWeight.bold),
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  final String label;
  final Color? backgroundColor;
  final Color? borderColor;
  final Color? textColor;

  const StatusBadge({
    super.key,
    required this.label,
    this.backgroundColor,
    this.borderColor,
    this.textColor,
  });

  factory StatusBadge.success(String label) => StatusBadge(
        label: label,
        backgroundColor: DigmTheme.green.withValues(alpha: 0.2),
        borderColor: DigmTheme.borderGreen(0.4),
        textColor: const Color(0xFF4ADE80),
      );

  factory StatusBadge.error(String label) => StatusBadge(
        label: label,
        backgroundColor: DigmTheme.red.withValues(alpha: 0.2),
        borderColor: DigmTheme.borderRed(0.4),
        textColor: const Color(0xFFF87171),
      );

  factory StatusBadge.info(String label) => StatusBadge(
        label: label,
        backgroundColor: DigmTheme.fuchsia.withValues(alpha: 0.2),
        borderColor: DigmTheme.borderFuchsia(0.4),
        textColor: DigmTheme.fuchsia400,
      );

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: backgroundColor ?? DigmTheme.fuchsia.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
            color: borderColor ?? DigmTheme.borderFuchsia(0.4), width: 1),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontFamily: 'Inter',
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: textColor ?? DigmTheme.pink,
        ),
      ),
    );
  }
}
