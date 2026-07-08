import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getOverview      = ()            => api.get('/overview').then(r => r.data)
export const getMonthlyMetrics= ()            => api.get('/metrics/monthly').then(r => r.data)
export const getFairnessMetrics=()            => api.get('/metrics/fairness').then(r => r.data)
export const getHeatmap       = ()            => api.get('/metrics/heatmap').then(r => r.data)
export const getComparison    = ()            => api.get('/metrics/comparison').then(r => r.data)
export const getThresholds    = ()            => api.get('/thresholds').then(r => r.data)
export const getCandidates    = (panel)       => api.get(`/candidates?panel=${panel}`).then(r => r.data)
export const postWhatIf       = (body)        => api.post('/candidate/whatif', body).then(r => r.data)
export const postInject       = (body)        => api.post('/inject', body).then(r => r.data)
export const postReset        = ()            => api.post('/reset').then(r => r.data)
