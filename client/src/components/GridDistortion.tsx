import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import './GridDistortion.css'

type Props = {
  grid?: number
  mouse?: number
  strength?: number
  relaxation?: number
  imageSrc: string
  className?: string
}

const vertexShader = `
uniform float time;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
uniform sampler2D uDataTexture;
uniform sampler2D uTexture;
uniform vec4 resolution;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 offset = texture2D(uDataTexture, vUv);
  gl_FragColor = texture2D(uTexture, uv - 0.02 * offset.rg);
}
`

export default function GridDistortion({
  grid = 15,
  mouse = 0.1,
  strength = 0.15,
  relaxation = 0.9,
  imageSrc,
  className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000)
    camera.position.z = 2

    const uniforms = {
      time: { value: 0 },
      resolution: { value: new THREE.Vector4() },
      uTexture: { value: null as THREE.Texture | null },
      uDataTexture: { value: null as THREE.DataTexture | null },
    }

    const applyTexture = (texture: THREE.Texture) => {
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.wrapS = THREE.ClampToEdgeWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      uniforms.uTexture.value = texture
      handleResize()
    }

    const beigeFallback = () => {
      const cv = document.createElement('canvas')
      cv.width = 1024
      cv.height = 1024
      const ctx = cv.getContext('2d')
      if (!ctx) return
      const theme = getComputedStyle(document.documentElement)
      const g = ctx.createLinearGradient(0, 0, 1024, 1024)
      g.addColorStop(0, theme.getPropertyValue('--page-tint').trim() || '#f4ead6')
      g.addColorStop(0.45, theme.getPropertyValue('--page-tint-mid').trim() || '#e6e8c9')
      g.addColorStop(1, theme.getPropertyValue('--page-tint-sage').trim() || '#d4ddc2')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 1024, 1024)
      applyTexture(new THREE.CanvasTexture(cv))
    }

    const textureLoader = new THREE.TextureLoader()
    textureLoader.setCrossOrigin('anonymous')
    textureLoader.load(imageSrc, applyTexture, undefined, beigeFallback)

    const size = grid
    const data = new Float32Array(4 * size * size)
    for (let i = 0; i < size * size; i++) {
      data[i * 4] = Math.random() * 255 - 125
      data[i * 4 + 1] = Math.random() * 255 - 125
    }

    const dataTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType)
    dataTexture.needsUpdate = true
    uniforms.uDataTexture.value = dataTexture

    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
    })
    const geometry = new THREE.PlaneGeometry(1, 1, size - 1, size - 1)
    const plane = new THREE.Mesh(geometry, material)
    scene.add(plane)

    const handleResize = () => {
      const rect = container.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      if (width === 0 || height === 0) return
      const containerAspect = width / height
      renderer.setSize(width, height)
      plane.scale.set(containerAspect, 1, 1)
      const frustumHeight = 1
      const frustumWidth = frustumHeight * containerAspect
      camera.left = -frustumWidth / 2
      camera.right = frustumWidth / 2
      camera.top = frustumHeight / 2
      camera.bottom = -frustumHeight / 2
      camera.updateProjectionMatrix()
      uniforms.resolution.value.set(width, height, 1, 1)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    const mouseState = { x: 0, y: 0, prevX: 0, prevY: 0, vX: 0, vY: 0 }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = 1 - (e.clientY - rect.top) / rect.height
      mouseState.vX = x - mouseState.prevX
      mouseState.vY = y - mouseState.prevY
      Object.assign(mouseState, { x, y, prevX: x, prevY: y })
    }

    const handleMouseLeave = () => {
      dataTexture.needsUpdate = true
      Object.assign(mouseState, { x: 0, y: 0, prevX: 0, prevY: 0, vX: 0, vY: 0 })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    handleResize()

    let raf = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      uniforms.time.value += 0.05
      const buf = dataTexture.image.data as Float32Array
      for (let i = 0; i < size * size; i++) {
        buf[i * 4] *= relaxation
        buf[i * 4 + 1] *= relaxation
      }
      const gridMouseX = size * mouseState.x
      const gridMouseY = size * mouseState.y
      const maxDist = size * mouse
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const distSq = (gridMouseX - i) ** 2 + (gridMouseY - j) ** 2
          if (distSq < maxDist * maxDist) {
            const index = 4 * (i + size * j)
            const power = Math.min(maxDist / Math.sqrt(distSq), 10)
            buf[index] += strength * 100 * mouseState.vX * power
            buf[index + 1] -= strength * 100 * mouseState.vY * power
          }
        }
      }
      dataTexture.needsUpdate = true
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      renderer.dispose()
      renderer.forceContextLoss()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
      geometry.dispose()
      material.dispose()
      dataTexture.dispose()
      uniforms.uTexture.value?.dispose()
    }
  }, [grid, mouse, strength, relaxation, imageSrc])

  return (
    <div
      ref={containerRef}
      className={`distortion-container ${className}`}
      style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}
    />
  )
}
