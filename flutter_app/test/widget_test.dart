import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fuego_core/digm_core.dart';

import 'package:digm_app/main.dart';
import 'package:digm_app/core/ffi/digm_core.dart';

void main() {
  testWidgets('App renders navigation', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          digmCoreProvider.overrideWithValue(
            AsyncValue.data(DigmCore(mnemonic: '', storagePath: '/tmp')),
          ),
        ],
        child: const DigmApp(),
      ),
    );

    await tester.pump();

    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationDestination), findsNWidgets(5));
  });
}
