// English texts by area (Spanish → English). Generated list: one import per file.
import assistant from './assistant.json'
import auth from './auth.json'
import calendar from './calendar.json'
import changelog from './changelog.json'
import dates from './dates.json'
import detail from './detail.json'
import home from './home.json'
import layout from './layout.json'
import projects_goals from './projects_goals.json'
import settings from './settings.json'
import tasks from './tasks.json'
import tasks2 from './tasks2.json'
import team from './team.json'
import timeline from './timeline.json'
import views from './views.json'

/** Each file on its own, so a test can spot one text translated two ways. */
export const FILES: Record<string, Record<string, string>> = { assistant, auth, calendar, changelog, dates, detail, home, layout, projects_goals, settings, tasks, tasks2, team, timeline, views }

export default Object.assign({}, ...Object.values(FILES)) as Record<string, string>
