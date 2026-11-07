// English texts by area (Spanish → English). Generated list: one import per file.
import auth from './auth.json'
import calendar from './calendar.json'
import dates from './dates.json'
import detail from './detail.json'
import layout from './layout.json'
import settings from './settings.json'
import tasks from './tasks.json'
import tasks2 from './tasks2.json'
import timeline from './timeline.json'
import views from './views.json'

export default { ...auth, ...calendar, ...dates, ...detail, ...layout, ...settings, ...tasks, ...tasks2, ...timeline, ...views } as Record<string, string>
