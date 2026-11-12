// The 3D muscle body on the phone: same scene, colours and outlines as the website (shared @shared/body3d), drawn with
// three.js into an Expo GLView. The model is bundled uncompressed (assets/models/muscles.glb) — phones have no WebAssembly
// for the website's Draco-compressed copy.
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useState } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { buildBody, drawViews } from '@shared/body3d';
import { ThemedText } from '@/components/themed-text';

let model: Promise<THREE.Object3D> | undefined;
function load() {
  return (model ??= (async () => {
    const asset = Asset.fromModule(require('../../assets/models/muscles.glb'));
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    // Android's fetch() can't read a bundled file:// asset (it hands back text), so read the bytes from disk
    const buf = Platform.OS === 'web' ? await (await fetch(uri)).arrayBuffer() : await new File(uri).arrayBuffer();
    const gltf = await new GLTFLoader().parseAsync(buf, '');
    return gltf.scene;
  })());
}

// three.js wants a canvas; GLView gives a raw GL context, so hand it a minimal stand-in.
function rendererFor(gl: ExpoWebGLRenderingContext) {
  const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
  const canvas = { width, height, style: {}, clientWidth: width, clientHeight: height, addEventListener: () => {}, removeEventListener: () => {}, getContext: () => gl } as unknown as HTMLCanvasElement;
  // three.js (r163+) refuses anything that is `instanceof WebGLRenderingContext`, and Expo GL registers its (WebGL 2
  // capable) context under that global name, so hide it while the renderer is built.
  const g = globalThis as { WebGLRenderingContext?: unknown };
  const saved = g.WebGLRenderingContext;
  g.WebGLRenderingContext = undefined;
  let r: THREE.WebGLRenderer;
  try { r = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGL2RenderingContext, antialias: true, alpha: true }); }
  finally { g.WebGLRenderingContext = saved; }
  r.setPixelRatio(1);
  r.setSize(width, height, false);
  return r;
}

export default function MuscleModel({ hit, compact = false, style }: { hit: Record<string, number>; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify(hit);
  if (failed) return null;
  const draw = async (gl: ExpoWebGLRenderingContext) => {
    try {
      const src = await load();
      const r = rendererFor(gl);
      drawViews(r, buildBody(src, hit), gl.drawingBufferWidth, gl.drawingBufferHeight, compact);
      gl.endFrameEXP?.();
    } catch (e) {
      console.warn('3D body failed', e);
      setFailed(true);
    }
  };
  if (compact) return <GLView key={key} style={[{ width: '100%', height: '100%' }, style]} onContextCreate={draw} />;
  return (
    <View style={style}>
      <GLView key={key} style={styles.full} onContextCreate={draw} accessibilityLabel="Body diagram, front and back, with worked muscles highlighted" />
      <View style={{ flexDirection: 'row' }}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Front</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>Back</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { width: '100%', height: 320 },
  label: { flex: 1, textAlign: 'center', fontSize: 12 },
});
