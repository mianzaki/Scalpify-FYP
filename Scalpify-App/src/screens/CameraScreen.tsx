import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PrimaryButton } from '../components/ui';
import { colors, shadow, spacing } from '../theme';
import { analyzePhoto, type AnalyzeResponse } from '../api';
import type { RootStackParamList } from '../navigation';
import { useUser } from '../userStore';
import { setLatestScan, type ScanContext } from '../scanStore';

type ScanState =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'ok'; data: AnalyzeResponse }
  | { kind: 'no-detection' }
  | { kind: 'error'; message: string };

export default function CameraScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [scan, setScan] = useState<ScanState>({ kind: 'idle' });
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const cam = useRef<CameraView>(null);
  const lastTapRef = useRef(0);
  const user = useUser();

  function flipCamera() {
    setFacing(f => (f === 'front' ? 'back' : 'front'));
  }

  function handleDoubleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      flipCamera();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }

  function zoomIn() {
    setZoom(z => Math.min(1, +(z + 0.1).toFixed(2)));
  }
  function zoomOut() {
    setZoom(z => Math.max(0, +(z - 0.1).toFixed(2)));
  }

  // Drag the knob along the rail. Top of rail → max zoom, bottom → no zoom.
  const railHeightRef = useRef(0);
  function onTrackLayout(e: LayoutChangeEvent) {
    railHeightRef.current = e.nativeEvent.layout.height;
  }
  const zoomPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        const h = railHeightRef.current;
        if (h <= 0) return;
        // gesture.moveY is screen Y of finger; we need it relative to rail top.
        // gesture.y0 is the touch start; gesture.dy is delta. Simpler: use locationY when available.
        const localY = (_evt.nativeEvent as any).locationY;
        if (typeof localY === 'number') {
          const pct = 1 - Math.max(0, Math.min(1, localY / h));
          setZoom(+pct.toFixed(2));
        }
      },
    }),
  ).current;
  function toggleTorch() {
    setTorch(t => !t);
    setFlash(f => (f === 'off' ? 'on' : 'off'));
  }

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#0E1B2C' }} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.root, { padding: spacing.xl, justifyContent: 'center' }]}>
        <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', marginVertical: 24 }}>
          Camera permission is required to capture scalp scans.
        </Text>
        <PrimaryButton label="Grant Permission" onPress={requestPermission} />
      </SafeAreaView>
    );
  }

  async function runAnalyze(uri: string, context?: ScanContext) {
    setScan({ kind: 'busy' });
    try {
      const data = await analyzePhoto(uri, user?.id ?? 'guest');
      const total =
        data.measurements.percentage.hair_coverage +
        data.measurements.percentage.baldness_ratio;
      if (total < 1) {
        setScan({ kind: 'no-detection' });
      } else {
        setLatestScan(data, uri, context);
        setScan({ kind: 'idle' });
        nav.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Scan' } as any }],
        });
      }
    } catch (e: any) {
      setScan({ kind: 'error', message: e?.message ?? String(e) });
    }
  }

  async function capture() {
    if (!cam.current || scan.kind === 'busy') return;
    try {
      const photo = await cam.current.takePictureAsync({ quality: 1 });
      if (!photo) throw new Error('No photo');
      setPendingUri(photo.uri);
    } catch (e: any) {
      setScan({ kind: 'error', message: e?.message ?? String(e) });
    }
  }

  async function pickFromLibrary() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!res.canceled && res.assets.length > 0) {
      setPendingUri(res.assets[0].uri);
    }
  }

  function handleContextSubmit(ctx: ScanContext | null) {
    const uri = pendingUri;
    setPendingUri(null);
    if (uri) void runAnalyze(uri, ctx ?? undefined);
  }

  return (
    <View style={styles.root}>
      <CameraView
        ref={cam}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        enableTorch={torch}
        zoom={zoom}
      />
      <View style={styles.darkOverlay} pointerEvents="none" />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleDoubleTap}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top + 8, 32) }]}>
        <Pressable onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate('MainTabs'))} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.topTitle}>Scalpify</Text>
        <Pressable hitSlop={12} onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate('MainTabs'))} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
      </View>

      {/* Headline pill */}
      <View style={styles.headPill}>
        <Text style={styles.headPillText}>ALIGN YOUR SCALP PHOTO</Text>
      </View>
      <Text style={styles.headHint}>Keep the camera 4-6 inches from the area</Text>
      <Text style={styles.headSubHint}>Double-tap to flip camera</Text>

      {/* Reticle */}
      <View style={styles.reticleWrap} pointerEvents="none">
        <View style={styles.reticleRing} />
        <View style={[styles.markerTop]} />
        <View style={[styles.markerLeft]} />
        <View style={[styles.markerRight]} />
        <View style={[styles.markerBottom]} />
      </View>

      {/* Zoom slider */}
      <View style={styles.zoomCol}>
        <Pressable hitSlop={8} onPress={zoomIn}>
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
        <View
          style={styles.zoomTouch}
          onLayout={onTrackLayout}
          {...zoomPanResponder.panHandlers}
        >
          <View style={styles.zoomTrack} />
          <View style={[styles.zoomKnob, { top: `${(1 - zoom) * 100}%`, marginTop: -10 }]} />
        </View>
        <Pressable hitSlop={8} onPress={zoomOut}>
          <Ionicons name="remove" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Lighting hint */}
      <View style={styles.hintCard}>
        <Ionicons name="sunny" size={18} color={colors.success} />
        <Text style={styles.hintText}>Natural lighting provides the most accurate analysis</Text>
      </View>

      {/* Bottom controls */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {scan.kind === 'busy' ? (
          <View style={styles.busyOverlay}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.busyText}>Analyzing your scan…</Text>
          </View>
        ) : scan.kind === 'error' ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>SCAN FAILED</Text>
            <Text style={styles.errorBody}>{scan.message}</Text>
            <Pressable onPress={() => setScan({ kind: 'idle' })} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Dismiss</Text>
            </Pressable>
          </View>
        ) : scan.kind === 'no-detection' ? (
          <View style={styles.errorBox}>
            <Text style={[styles.errorTitle, { color: colors.warning }]}>NO SCALP DETECTED</Text>
            <Text style={styles.errorBody}>
              Hold the phone above your head and point down at the crown — not at your face.
            </Text>
            <Pressable onPress={() => setScan({ kind: 'idle' })} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.controls}>
            <Pressable onPress={pickFromLibrary} style={styles.sideBtn}>
              <Ionicons name="images-outline" size={22} color={colors.primary} />
              <Text style={styles.sideBtnText}>UPLOAD</Text>
            </Pressable>

            <Pressable onPress={capture}>
              <View style={styles.shutterOuter}>
                <View style={styles.shutterInner}>
                  <Ionicons name="aperture" size={28} color={colors.primary} />
                </View>
              </View>
            </Pressable>

            <Pressable onPress={toggleTorch} style={styles.sideBtn}>
              <Ionicons
                name={torch ? 'flash' : 'flash-outline'}
                size={24}
                color={torch ? colors.warning : '#fff'}
              />
              <Text style={[styles.sideBtnText, torch && { color: colors.warning }]}>FLASH</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          onPress={() => setFacing(f => (f === 'front' ? 'back' : 'front'))}
          style={styles.switchCamBtn}
          hitSlop={8}
        >
          <Ionicons name="camera-reverse" size={18} color="#fff" />
          <Text style={styles.switchCamText}>Switch camera</Text>
        </Pressable>
      </SafeAreaView>

      <PreScanModal
        visible={pendingUri !== null}
        showPregnancy={user?.medical?.sex === 'female'}
        onSubmit={handleContextSubmit}
        onSkip={() => handleContextSubmit(null)}
      />
    </View>
  );
}

function PreScanModal({
  visible,
  showPregnancy,
  onSubmit,
  onSkip,
}: {
  visible: boolean;
  showPregnancy: boolean;
  onSubmit: (ctx: ScanContext) => void;
  onSkip: () => void;
}) {
  const [stress, setStress] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [sleep, setSleep] = useState('7');
  const [shedding, setShedding] = useState<ScanContext['newSheddingNoticed']>('normal');
  const [pregnant, setPregnant] = useState(false);

  function handleSubmit() {
    const sleepNum = parseFloat(sleep);
    onSubmit({
      stressLevel: stress,
      sleepHours: Number.isFinite(sleepNum) ? sleepNum : 0,
      newSheddingNoticed: shedding,
      daysSinceWashed: null,
      pregnantOrPostpartum: showPregnancy ? pregnant : undefined,
    });
    setStress(3); setSleep('7'); setShedding('normal'); setPregnant(false);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onSkip}>
      <Pressable style={modalStyles.backdrop} onPress={onSkip}>
        <Pressable style={modalStyles.card} onPress={() => {}}>
          <View style={modalStyles.head}>
            <Text style={modalStyles.title}>Quick context</Text>
            <Pressable onPress={onSkip} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={modalStyles.sub}>All optional — helps interpret today's scan.</Text>

          <Text style={modalStyles.label}>Stress this week</Text>
          <View style={modalStyles.chipRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable
                key={n}
                onPress={() => setStress(n as 1 | 2 | 3 | 4 | 5)}
                style={[modalStyles.chip, stress === n && modalStyles.chipOn]}
              >
                <Text style={[modalStyles.chipText, stress === n && modalStyles.chipTextOn]}>{n}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={modalStyles.label}>Sleep (hours/night)</Text>
          <TextInput
            value={sleep}
            onChangeText={setSleep}
            keyboardType="decimal-pad"
            placeholder="e.g. 7"
            placeholderTextColor={colors.textFaint}
            style={modalStyles.input}
          />

          <Text style={modalStyles.label}>Shedding</Text>
          <View style={modalStyles.chipRow}>
            {(['none', 'normal', 'increased'] as const).map(opt => (
              <Pressable
                key={opt}
                onPress={() => setShedding(opt)}
                style={[modalStyles.chip, shedding === opt && modalStyles.chipOn]}
              >
                <Text style={[modalStyles.chipText, shedding === opt && modalStyles.chipTextOn]}>{opt}</Text>
              </Pressable>
            ))}
          </View>

          {showPregnancy && (
            <Pressable
              onPress={() => setPregnant(p => !p)}
              style={[modalStyles.chip, { alignSelf: 'flex-start' }, pregnant && modalStyles.chipOn]}
            >
              <Text style={[modalStyles.chipText, pregnant && modalStyles.chipTextOn]}>
                Currently pregnant or postpartum
              </Text>
            </Pressable>
          )}

          <PrimaryButton label="Use this context" onPress={handleSubmit} style={{ marginTop: spacing.md }} />
          <Pressable onPress={onSkip} hitSlop={8} style={{ alignItems: 'center', paddingTop: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>Skip</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.textStrong, fontSize: 20, fontWeight: '800' },
  sub: { color: colors.textMuted, fontSize: 13 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  input: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E1B2C' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: '#EDF2F6',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  topTitle: { color: colors.primary, fontSize: 22, fontWeight: '800' },

  headPill: {
    alignSelf: 'center',
    backgroundColor: '#0E1B2C',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: spacing.lg,
  },
  headPillText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  headHint: { color: '#fff', fontSize: 14, textAlign: 'center', marginTop: 12 },
  headSubHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center', marginTop: 4 },

  reticleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleRing: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  markerTop: {
    position: 'absolute',
    top: '30%',
    width: 14,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  markerBottom: {
    position: 'absolute',
    bottom: '30%',
    width: 14,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  markerLeft: {
    position: 'absolute',
    left: '14%',
    width: 4,
    height: 14,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  markerRight: {
    position: 'absolute',
    right: '14%',
    width: 4,
    height: 14,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  zoomCol: {
    position: 'absolute',
    right: spacing.lg,
    top: '40%',
    bottom: '40%',
    width: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  // Wide, transparent touch target for dragging; rail and knob live inside.
  zoomTouch: { flex: 1, width: 32, marginVertical: 6, alignItems: 'center', justifyContent: 'flex-start' },
  zoomTrack: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#fff' },
  zoomKnob: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },

  hintCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fff',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: 14,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadow.cardStrong,
  },
  hintText: { color: colors.text, fontSize: 13, flex: 1 },

  bottomBar: {
    backgroundColor: '#0E1B2C',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  sideBtn: {
    width: 62,
    alignItems: 'center',
    gap: 6,
  },
  sideBtnText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchCamBtn: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  switchCamText: { color: '#fff', fontSize: 12 },

  busyOverlay: { alignItems: 'center', paddingVertical: spacing.xl, gap: 12 },
  busyText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  errorBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.lg,
    gap: 8,
  },
  errorTitle: { color: colors.danger, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  errorBody: { color: colors.text, fontSize: 14, lineHeight: 20 },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
});
