import * as THREE from 'three'
import fragmentShader from '../shaders/grid.frag.glsl?raw'
import vertexShader from '../shaders/grid.vert.glsl?raw'

const CARD = {
  width: 1,
  height: 1.3,
  rows: 3,
  columns: 6,
  gap: 0.05,
} as const

function setCoveredTextureScale(texture: THREE.Texture, aspect: number, target: THREE.Vector2) {
  const image = texture.image as {
    width: number
    height: number
  }

  const imageAspect = image.width / image.height

  if (aspect < imageAspect) {
    target.set(aspect / imageAspect, 1)
    return
  }

  target.set(1, imageAspect / aspect)
}

export class GridMotionScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100)
  private readonly cards = new THREE.Group()

  private readonly centerTarget = new THREE.Vector3()
  private readonly edgeTarget = new THREE.Vector3()
  private readonly projectionMatrix = new THREE.Matrix4()
  private readonly frustum = new THREE.Frustum()
  private readonly positionTarget = new THREE.Vector2()

  private geometry?: THREE.PlaneGeometry
  private textures: THREE.Texture[] = []
  private materials: THREE.ShaderMaterial[] = []

  private activePointerId?: number
  private previousPointer = { x: 0, y: 0 }
  private animationFrameId = 0
  private disposed = false

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene.background = new THREE.Color('#000000')
    this.scene.add(this.cards)

    this.camera.position.z = CARD.height * 2 + CARD.gap * (CARD.rows + 1)

    this.container.appendChild(this.renderer.domElement)

    this.addEvents()
    this.resize()
    this.animate()
  }

  async init() {
    const textureLoader = new THREE.TextureLoader()

    const textures = await Promise.all(
      Array.from({ length: CARD.rows * CARD.columns }, (_, index) => {
        const path = `${import.meta.env.BASE_URL}images/${index + 1}.jpg`
        return textureLoader.loadAsync(path)
      }),
    )

    if (this.disposed) {
      textures.forEach((texture) => texture.dispose())
      return
    }

    this.textures = textures

    this.textures.forEach((texture) => {
      texture.wrapS = THREE.MirroredRepeatWrapping
      texture.wrapT = THREE.MirroredRepeatWrapping
      texture.colorSpace = THREE.SRGBColorSpace
    })

    this.createCards()
  }

  private createCards() {
    const { width, height, rows, columns, gap } = CARD

    this.geometry = new THREE.PlaneGeometry(width, height, 50, 50)

    const baseMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tImage: { value: null },
        uUvScale: { value: new THREE.Vector2() },
        uSpeed: { value: new THREE.Vector2() },
      },
      vertexShader,
      fragmentShader,
    })

    const centerX = ((width + gap) * (columns - 1)) / 2
    const centerY = ((height + gap) * (rows - 1)) / 2
    const halfRow = (height + gap) / 2

    let textureIndex = 0

    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        const material = baseMaterial.clone()
        const texture = this.textures[textureIndex]

        textureIndex += 1

        material.uniforms.tImage.value = texture

        setCoveredTextureScale(texture, width / height, material.uniforms.uUvScale.value as THREE.Vector2)

        const mesh = new THREE.Mesh(this.geometry, material)

        mesh.position.set(width * column + gap * column - centerX, height * row + gap * row - centerY, 0)

        if (column % 2 === 0) {
          mesh.position.y += halfRow
        }

        this.materials.push(material)
        this.cards.add(mesh)
      }
    }

    baseMaterial.dispose()
  }

  private addEvents() {
    window.addEventListener('resize', this.resize)

    this.container.addEventListener('wheel', this.handleWheel, { passive: false })

    this.container.addEventListener('pointerdown', this.handlePointerDown)

    window.addEventListener('pointermove', this.handlePointerMove)

    window.addEventListener('pointerup', this.handlePointerUp)

    window.addEventListener('pointercancel', this.handlePointerUp)
  }

  private removeEvents() {
    window.removeEventListener('resize', this.resize)
    this.container.removeEventListener('wheel', this.handleWheel)

    this.container.removeEventListener('pointerdown', this.handlePointerDown)

    window.removeEventListener('pointermove', this.handlePointerMove)

    window.removeEventListener('pointerup', this.handlePointerUp)

    window.removeEventListener('pointercancel', this.handlePointerUp)
  }

  private handleWheel = (event: WheelEvent) => {
    event.preventDefault()

    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? this.container.clientHeight : 1

    this.positionTarget.y += event.deltaY * unit * 0.003
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return
    }

    this.activePointerId = event.pointerId
    this.previousPointer = {
      x: event.clientX,
      y: event.clientY,
    }

    this.container.setPointerCapture(event.pointerId)
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.activePointerId) {
      return
    }

    this.positionTarget.x += (event.clientX - this.previousPointer.x) * 0.004

    this.positionTarget.y -= (event.clientY - this.previousPointer.y) * 0.004

    this.previousPointer = {
      x: event.clientX,
      y: event.clientY,
    }
  }

  private handlePointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.activePointerId) {
      return
    }

    if (this.container.hasPointerCapture(event.pointerId)) {
      this.container.releasePointerCapture(event.pointerId)
    }

    this.activePointerId = undefined
  }

  private resize = () => {
    const width = this.container.clientWidth || window.innerWidth
    const height = this.container.clientHeight || window.innerHeight
    const aspect = width / height

    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height, false)

    const responsiveScale = THREE.MathUtils.smoothstep(aspect, 1.969, 3)

    const scale = THREE.MathUtils.lerp(1, 1.5, responsiveScale)

    this.scene.scale.setScalar(scale)
  }

  private updateCardPositions() {
    if (this.cards.children.length === 0) {
      return
    }

    this.camera.updateMatrixWorld()

    this.projectionMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse)

    this.frustum.setFromProjectionMatrix(this.projectionMatrix)

    const { width, height, rows, columns, gap } = CARD

    const gridHeight = (height + gap) * rows
    const gridWidth = (width + gap) * columns

    this.cards.children.forEach((child) => {
      const card = child as THREE.Mesh

      card.getWorldPosition(this.centerTarget)

      if (this.centerTarget.y < 0) {
        this.edgeTarget.copy(this.centerTarget)
        this.edgeTarget.y += height / 2 + gap
        this.edgeTarget.x = 0

        if (!this.frustum.containsPoint(this.edgeTarget)) {
          card.position.y += gridHeight
        }
      } else {
        this.edgeTarget.copy(this.centerTarget)
        this.edgeTarget.y -= height / 2 + gap
        this.edgeTarget.x = 0

        if (!this.frustum.containsPoint(this.edgeTarget)) {
          card.position.y -= gridHeight
        }
      }

      if (this.centerTarget.x < 0) {
        this.edgeTarget.copy(this.centerTarget)
        this.edgeTarget.x += width / 2 + gap
        this.edgeTarget.y = 0

        if (!this.frustum.containsPoint(this.edgeTarget)) {
          card.position.x += gridWidth
        }
      } else {
        this.edgeTarget.copy(this.centerTarget)
        this.edgeTarget.x -= width / 2 + gap
        this.edgeTarget.y = 0

        if (!this.frustum.containsPoint(this.edgeTarget)) {
          card.position.x -= gridWidth
        }
      }
    })
  }

  private animate = () => {
    if (this.disposed) {
      return
    }

    this.updateCardPositions()

    this.cards.position.x = THREE.MathUtils.lerp(this.cards.position.x, this.positionTarget.x, 0.1)

    this.cards.position.y = THREE.MathUtils.lerp(this.cards.position.y, this.positionTarget.y, 0.1)

    const speedX = this.positionTarget.x - this.cards.position.x

    const speedY = this.positionTarget.y - this.cards.position.y

    this.materials.forEach((material) => {
      const speed = material.uniforms.uSpeed.value as THREE.Vector2

      speed.x = THREE.MathUtils.lerp(speed.x, speedX, 0.1)

      speed.y = THREE.MathUtils.lerp(speed.y, speedY, 0.1)
    })

    this.renderer.render(this.scene, this.camera)

    this.animationFrameId = requestAnimationFrame(this.animate)
  }

  dispose() {
    if (this.disposed) {
      return
    }

    this.disposed = true

    this.removeEvents()
    cancelAnimationFrame(this.animationFrameId)

    this.geometry?.dispose()
    this.materials.forEach((material) => material.dispose())
    this.textures.forEach((texture) => texture.dispose())

    this.cards.clear()
    this.scene.clear()

    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
  }
}
