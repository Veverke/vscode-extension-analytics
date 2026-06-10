import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Sparkline from '../../src/components/charts/Sparkline'

describe('Sparkline', () => {
  it('renders an SVG element', () => {
    render(<Sparkline points={[0, 50, 100]} />)
    expect(screen.getByLabelText('sparkline')).toBeInTheDocument()
  })

  it('SVG polyline has correct number of points for [0, 50, 100]', () => {
    const { container } = render(<Sparkline points={[0, 50, 100]} />)
    const polyline = container.querySelector('polyline')
    expect(polyline).not.toBeNull()
    const pts = polyline!.getAttribute('points')!.trim().split(' ')
    expect(pts).toHaveLength(3)
  })

  it('first point y-coordinate is highest (0 maps to bottom = highest y)', () => {
    // points: [0, 50, 100], height=30
    // 0 → y = height - (0/100)*height = 30 (bottom)
    // 100 → y = height - (100/100)*height = 0 (top)
    const { container } = render(<Sparkline points={[0, 50, 100]} height={30} />)
    const polyline = container.querySelector('polyline')!
    const pts = polyline.getAttribute('points')!.trim().split(' ')
    const firstY = parseFloat(pts[0].split(',')[1])
    const lastY = parseFloat(pts[2].split(',')[1])
    // First point (value=0) should have the largest y (closest to bottom)
    expect(firstY).toBeGreaterThan(lastY)
  })

  it('last point x-coordinate equals width', () => {
    const { container } = render(<Sparkline points={[0, 50, 100]} width={80} />)
    const polyline = container.querySelector('polyline')!
    const pts = polyline.getAttribute('points')!.trim().split(' ')
    const lastX = parseFloat(pts[pts.length - 1].split(',')[0])
    expect(lastX).toBeCloseTo(80, 1)
  })

  it('single point renders a circle (not polyline)', () => {
    const { container } = render(<Sparkline points={[42]} />)
    expect(container.querySelector('circle')).not.toBeNull()
    expect(container.querySelector('polyline')).toBeNull()
  })

  it('empty points renders empty SVG without crash', () => {
    const { container } = render(<Sparkline points={[]} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(container.querySelector('polyline')).toBeNull()
    expect(container.querySelector('circle')).toBeNull()
  })

  it('all same values renders horizontal line (flat)', () => {
    const { container } = render(<Sparkline points={[50, 50, 50]} height={30} />)
    const polyline = container.querySelector('polyline')!
    const pts = polyline.getAttribute('points')!.trim().split(' ')
    const ys = pts.map(p => parseFloat(p.split(',')[1]))
    // All y values should be the same (flat line at height/2)
    expect(ys[0]).toBeCloseTo(ys[1], 1)
    expect(ys[1]).toBeCloseTo(ys[2], 1)
  })

  it('uses default width and height when not specified', () => {
    const { container } = render(<Sparkline points={[10, 20, 30]} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('80')
    expect(svg.getAttribute('height')).toBe('30')
  })

  it('respects custom color prop', () => {
    const { container } = render(<Sparkline points={[10, 20, 30]} color="#ff0000" />)
    const polyline = container.querySelector('polyline')!
    expect(polyline.getAttribute('stroke')).toBe('#ff0000')
  })

  it('decreasing sequence: first y < last y (first value highest, maps to lowest y)', () => {
    const { container } = render(<Sparkline points={[100, 50, 0]} height={30} />)
    const polyline = container.querySelector('polyline')!
    const pts = polyline.getAttribute('points')!.trim().split(' ')
    const firstY = parseFloat(pts[0].split(',')[1])
    const lastY = parseFloat(pts[2].split(',')[1])
    // value 100 → y=0 (top), value 0 → y=30 (bottom)
    expect(firstY).toBeLessThan(lastY)
  })
})