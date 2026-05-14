import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:digm_app/main.dart';

void main() {
  testWidgets('App renders navigation', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: DigmApp()),
    );

    // Navigation bar with 3 destinations
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationDestination), findsNWidgets(3));
  });
}
