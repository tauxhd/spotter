// The isometric 3D gym on the phone: same scene, glow and camera glide as the website (shared @shared/gym3d), drawn with
// three.js into an Expo GLView. Tap a machine to pick it.
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { equipment } from '@shared/data';
import { buildGym, drawGym, focus, pick, step, type Gym } from '@shared/gym3d';
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

export default function Gym3D({ sel, onPick, height = 460 }: { sel?: string; onPick: (id?: string) => void; height?: number }) {
  const theme = useTheme();
  const [state, setState] = useState<'loading' | 'ok' | 'failed'>('loading');
  const st = useRef<{ gl: ExpoWebGLRenderingContext; r: THREE.WebGLRenderer; g: Gym; raf: number } | null>(null);
  const size = useRef({ w: 1, h: 1 });

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
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="3D view of the gym"
        onLayout={(e) => { size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}
        onPress={(e) => { const s = st.current; if (s) onPick(pick(s.g, e.nativeEvent.locationX / size.current.w, e.nativeEvent.locationY / size.current.h)); }}>
        <GLView style={StyleSheet.absoluteFill} onContextCreate={init} pointerEvents="none" />
      </Pressable>
      {state === 'loading' && <View style={[StyleSheet.absoluteFill, { padding: 8 }]} pointerEvents="none"><Bone h="100%" /></View>}
      {sel && state === 'ok' && (
        <Pressable onPress={() => onPick(undefined)} style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" style={{ fontSize: 12 }}>Whole gym</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ chip: { position: 'absolute', right: 8, bottom: 8, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 7 } });
