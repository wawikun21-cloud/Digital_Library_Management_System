import * as THREE from "three"

const SEGMENTS = 32
const CURL_AMOUNT = 0.3
const PAGE_THICKNESS = 0.003

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform sampler2D pageTexture;
  uniform sampler2D backTexture;
  uniform float flip;
  uniform vec3 lightPos;
  uniform float pageWidth;
  uniform float hasTexture;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec4 texColor;

    if (hasTexture > 0.5) {
      if (flip < 0.5) {
        texColor = texture2D(pageTexture, vUv);
      } else {
        texColor = texture2D(backTexture, vec2(1.0 - vUv.x, vUv.y));
      }
    } else {
      texColor = vec4(0.95, 0.95, 0.93, 1.0);
    }

    vec3 lightDir = normalize(lightPos - vWorldPosition);
    float diffuse = max(dot(normal, lightDir), 0.0);

    float curlHighlight = smoothstep(1.0, 0.3, vUv.x) * 0.15;
    float edgeDark = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);

    vec3 ambient = vec3(0.55, 0.55, 0.58);
    vec3 lit = texColor.rgb * (ambient + vec3(diffuse) * 0.5 + curlHighlight);
    lit *= mix(0.85, 1.0, edgeDark);

    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 64.0);
    lit += vec3(spec) * 0.3;

    gl_FragColor = vec4(lit, texColor.a);
  }
`

export function createPageGeometry(width, height) {
  return new THREE.PlaneGeometry(width, height, SEGMENTS, 1)
}

export function applyCurlDeformation(geometry, progress) {
  const pos = geometry.attributes.position
  const width = geometry.parameters.width
  const height = geometry.parameters.height

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const normX = (x + width / 2) / width

    let newX
    let newZ

    if (progress < 0.5) {
      const t = progress * 2
      const angle = t * Math.PI * 0.5
      const curlRadius = CURL_AMOUNT * width

      if (normX > 1 - t) {
        const localX = (normX - (1 - t)) / t
        const curlAngle = localX * angle
        newX = x - Math.sin(curlAngle) * curlRadius * (1 - progress)
        newZ = (1 - Math.cos(curlAngle)) * curlRadius * (1 - progress)
      } else {
        newX = x * (1 - progress * 0.1)
        newZ = 0
      }
    } else {
      const t = (progress - 0.5) * 2
      const angle = Math.PI * 0.5 - t * Math.PI * 0.5
      const curlRadius = CURL_AMOUNT * width

      if (normX < t) {
        newX = x
        newZ = 0
      } else {
        const localX = (normX - t) / (1 - t)
        const curlAngle = localX * angle
        newX = x - Math.sin(curlAngle) * curlRadius * progress
        newZ = (1 - Math.cos(curlAngle)) * curlRadius * progress
      }
    }

    pos.setX(i, newX)
    pos.setZ(i, newZ + Math.sin(normX * Math.PI) * PAGE_THICKNESS * progress)
  }

  pos.needsUpdate = true
  geometry.computeVertexNormals()
}

export function createPageMaterial(frontTexture, backTexture) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      pageTexture: { value: frontTexture },
      backTexture: { value: backTexture },
      flip:        { value: 0 },
      lightPos:    { value: new THREE.Vector3(5, 5, 5) },
      pageWidth:   { value: 1 },
      hasTexture:  { value: frontTexture ? 1 : 0 },
    },
    side: THREE.DoubleSide,
    transparent: true,
  })
}

export function createScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)
  return scene
}

export function createCamera(width, height) {
  const aspect = width / height
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100)
  camera.position.set(0, 0, 3)
  camera.lookAt(0, 0, 0)
  return camera
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  return renderer
}

export function createLights(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambient)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(5, 8, 5)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 1024
  dirLight.shadow.mapSize.height = 1024
  scene.add(dirLight)

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
  fillLight.position.set(-3, 2, -2)
  scene.add(fillLight)
}

export function createDropShadowPlane(scene, width, height) {
  const shadowGeo = new THREE.PlaneGeometry(width * 3, height * 3)
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.2 })
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat)
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.position.y = -height * 0.5 - 0.01
  shadowPlane.receiveShadow = true
  scene.add(shadowPlane)
}

export function createSpineMesh(scene, height, thickness) {
  const spineGeo = new THREE.BoxGeometry(thickness, height, 0.02)
  const spineMat = new THREE.MeshStandardMaterial({
    color: 0x4a4a4a,
    roughness: 0.7,
    metalness: 0.1,
  })
  const spine = new THREE.Mesh(spineGeo, spineMat)
  spine.position.set(-thickness / 2, 0, -0.01)
  scene.add(spine)
}

export function loadTexture(url) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader()
    loader.load(url, resolve, undefined, reject)
  })
}

export function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas")
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    )
  } catch {
    return false
  }
}

export { THREE }
