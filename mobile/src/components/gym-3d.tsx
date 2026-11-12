// The isometric 3D gym on the phone: same scene, glow and camera glide as the website (shared @shared/gym3d), drawn with
// three.js into an Expo GLView. Tap a machine to pick it, drag to look around, pinch to zoom. `onGrab` tells the screen
// to stop scrolling while a finger is on the gym.
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useEffect, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { equipment } from '@shared/data';
import { buildGym, drawGym, focus, pan, pick, step, type Gym } from '@shared/gym3d';
import { Bone } from '@/components/skeleton';
import { rendererFor } from '@/components/muscle-model';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

let model: Promise<THREE.Object3D> | undefined;
function load() {
  return (model ??= (async () => {
    const asset = Asset.fromModule(require('../../assets/models/gym.glb'));
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    const buf = Platform.OS === 'web' ? await (await fetch(uri)).arrayBuffer() : await new File(uri).arrayBuffer();
    return (await new GLTFLoader().parseAsync(buf, '')).scene;
  })());
}
const ids = equipment.map((e) => e.id);

export default function Gym3D({ sel, onPick, onGrab, height = 460 }: { sel?: string; onPick: (id?: string) => void; onGrab?: (on: boolean) => void; height?: number }) {
  const theme = useTheme();
  const [state, setState] = useState<'loading' | 'ok' | 'failed'>('loading');
  const st = useRef<{ gl: ExpoWebGLRenderingContext; r: THREE.WebGLRenderer; g: Gym; raf: number } | null>(null);
  const size = useRef({ w: 1, h: 1 });
  const last = useRef({ dx: 0, dy: 0, d: 1, n: 1, pinched: false });
  const cb = useRef({ onPick, onGrab });
  useEffect(() => { cb.current = { onPick, onGrab }; });
  const [pr] = useState(() => {
    const spread = (e: GestureResponderEvent) => {
      const [a, b] = e.nativeEvent.touches;
      return a && b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) || 1 : 1;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { last.current = { dx: 0, dy: 0, d: 1, n: 1, pinched: false }; cb.current.onGrab?.(true); },
      onPanResponderMove: (e, g) => {
        const l = last.current, s = st.current, d = spread(e);
        if (s && g.numberActiveTouches === l.n) { // same fingers: pan (+ pinch); a finger added or lifted just re-anchors
          const k = s.gl.drawingBufferHeight / size.current.h; // dp -> GL pixels
          pan(s.g, (g.dx - l.dx) * k, (g.dy - l.dy) * k, s.gl.drawingBufferHeight, l.n > 1 ? d / l.d : 1);
          draw();
        }
        last.current = { dx: g.dx, dy: g.dy, d, n: g.numberActiveTouches, pinched: l.pinched || g.numberActiveTouches > 1 };
      },
      onPanResponderRelease: (e, g) => {
        cb.current.onGrab?.(false);
        const s = st.current;
        if (!s || last.current.pinched || Math.abs(g.dx) + Math.abs(g.dy) > 8) return; // a drag or pinch, not a tap
        const id = pick(s.g, e.nativeEvent.locationX / size.current.w, e.nativeEvent.locationY / size.current.h);
        if (id) cb.current.onPick(id); // a tap on the floor keeps where you are
      },
      onPanResponderTerminate: () => cb.current.onGrab?.(false),
    });
  });

  function draw() {
    const s = st.current;
    if (!s) return;
    drawGym(s.r, s.g, s.gl.drawingBufferWidth, s.gl.drawingBufferHeight);
    s.gl.endFrameEXP();
  }
  function run() { // draw frames until the glide settles
    const s = st.current;
    if (!s || s.raf) return;
    let last = performance.now();
    const frame = (now: number) => {
      const moving = step(s.g, Math.min(0.05, (now - last) / 1000));
      last = now;
      draw();
      s.raf = moving ? requestAnimationFrame(frame) : 0;
    };
    s.raf = requestAnimationFrame(frame);
  }
  async function init(gl: ExpoWebGLRenderingContext) {
    try {
      const g = buildGym(await load(), ids);
      focus(g, sel, gl.drawingBufferWidth / gl.drawingBufferHeight, true);
      st.current = { gl, r: rendererFor(gl), g, raf: 0 };
      draw();
      setState('ok');
    } catch (e) {
      console.warn('3D gym failed', e);
      setState('failed');
    }
  }
  useEffect(() => { // a new pick: glow + glide
    const s = st.current;
    if (!s || s.g.sel === sel) return;
    focus(s.g, sel, s.gl.drawingBufferWidth / s.gl.drawingBufferHeight);
    run();
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (st.current) { cancelAnimationFrame(st.current.raf); st.current.r.dispose(); } st.current = null; }, []);

  if (state === 'failed') return null;
  return (
    <View style={{ height }}>
      <View style={StyleSheet.absoluteFill} accessibilityLabel="3D view of the gym" {...pr.panHandlers}
        onLayout={(e) => { size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}>
        <GLView style={StyleSheet.absoluteFill} onContextCreate={init} pointerEvents="none" />
      </View>
      {state === 'loading' && <View style={[StyleSheet.absoluteFill, { padding: 8 }]} pointerEvents="none"><Bone h="100%" /></View>}
      {sel && state === 'ok' && (
        <Pressable onPress={() => onPick(undefined)} style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" style={{ fontSize: 12 }}>Back to entrance</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ chip: { position: 'absolute', right: 8, bottom: 8, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 7 } });
