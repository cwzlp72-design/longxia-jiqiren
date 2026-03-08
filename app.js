const scheduleTemplate = [
  ["06:00 - 07:00", "起床、洗漱、喝水、简单拉伸", "早晨启动", true],
  ["07:00 - 08:00", "早餐、整理环境、确定三件大事", "早餐 / 准备", true],
  ["08:00 - 09:00", "开始重点任务 1", "重点任务", true],
  ["09:00 - 10:00", "继续重点任务 1", "重点任务", true],
  ["10:00 - 11:00", "处理重点任务 2", "工作 / 学习", true],
  ["11:00 - 12:00", "消息、杂事、阶段收尾", "工作 / 学习", false],
  ["12:00 - 13:00", "午餐和休息", "中午调整", false],
  ["13:00 - 14:00", "开始下午任务", "工作 / 学习", true],
  ["14:00 - 15:00", "推进核心事项", "工作 / 学习", true],
  ["15:00 - 16:00", "沟通、安排、处理事项", "事项处理", false],
  ["16:00 - 17:00", "收尾今天的重要内容", "事项处理", true],
  ["17:00 - 18:00", "缓冲和补漏", "收尾 / 缓冲", false],
  ["18:00 - 19:00", "晚餐和放松", "晚间过渡", false],
  ["19:00 - 20:00", "轻任务 / 简单整理", "晚间任务", false],
  ["20:00 - 21:00", "娱乐时间，但别上头", "娱乐", false],
  ["21:00 - 22:00", "洗漱、整理、准备明天", "整理 / 休息", true],
  ["22:00 - 23:00", "放松、停手机、准备睡觉", "睡前收尾", true]
];

const habitTemplate = [
  "按时起床",
  "三餐正常",
  "喝水达标",
  "有活动或运动",
  "娱乐不过量",
  "23:00 前睡觉"
];

const storageKey = "xiaxia-planner-state-v1";
const state = loadState();

const scheduleList = document.getElementById("scheduleList");
const habitList = document.getElementById("habitList");
const completionRate = document.getElementById("completionRate");
const checkedCount = document.getElementById("checkedCount");
const habitScore = document.getElementById("habitScore");
const resetBtn = document.getElementById("resetBtn");
const nowTime = document.getElementById("nowTime");
const nowTask = document.getElementById("nowTask");

renderSchedule();
renderHabits();
bindInputs();
refreshStats();
refreshCurrentSlot();
setInterval(refreshCurrentSlot, 60000);

resetBtn.addEventListener("click", () => {
  if (!window.confirm("要把今天的打卡和填写内容清空吗？")) {
    return;
  }

  localStorage.removeItem(storageKey);
  window.location.reload();
});

function loadState() {
  const base = {
    planDate: new Date().toISOString().slice(0, 10),
    coreGoal: "",
    top1: "",
    top2: "",
    top3: "",
    reviewWin: "",
    reviewFix: "",
    schedule: scheduleTemplate.map(([, task, , priority]) => ({ task, done: false, priority })),
    habits: habitTemplate.map((name) => ({ name, done: false }))
  };

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved) {
      return base;
    }

    return {
      ...base,
      ...saved,
      schedule: scheduleTemplate.map(([, fallbackTask, , priority], index) => ({
        task: saved.schedule?.[index]?.task || fallbackTask,
        done: Boolean(saved.schedule?.[index]?.done),
        priority
      })),
      habits: habitTemplate.map((name, index) => ({
        name,
        done: Boolean(saved.habits?.[index]?.done)
      }))
    };
  } catch (error) {
    return base;
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function bindInputs() {
  ["planDate", "coreGoal", "top1", "top2", "top3", "reviewWin", "reviewFix"].forEach((id) => {
    const el = document.getElementById(id);
    el.value = state[id] || "";
    el.addEventListener("input", (event) => {
      state[id] = event.target.value;
      saveState();
    });
  });
}

function renderSchedule() {
  scheduleList.innerHTML = "";

  scheduleTemplate.forEach(([time, , note], index) => {
    const item = document.createElement("article");
    const scheduleItem = state.schedule[index];
    const cardClass = ["schedule-item"];

    if (scheduleItem.done) {
      cardClass.push("done");
    } else {
      cardClass.push("pending");
      if (scheduleItem.priority) {
        cardClass.push("priority");
      }
    }

    if (isCurrentSlot(time)) {
      cardClass.push("current");
    }

    item.className = cardClass.join(" ");

    const statusClass = scheduleItem.done
      ? "status-pill done"
      : scheduleItem.priority
        ? "status-pill priority"
        : "status-pill";
    const statusText = scheduleItem.done ? "已完成" : scheduleItem.priority ? "优先盯住" : "待进行";

    item.innerHTML = `
      <div>
        <div class="time-badge">${time}</div>
        <div class="slot-note">${note}</div>
      </div>
      <label>
        <span>安排内容</span>
        <input type="text" data-schedule-input="${index}" value="${escapeHtml(scheduleItem.task)}">
      </label>
      <div>
        <label class="check-wrap">
          <input type="checkbox" data-schedule-check="${index}" ${scheduleItem.done ? "checked" : ""}>
          <span>打卡</span>
        </label>
        <div class="${statusClass}">${statusText}</div>
      </div>
    `;

    scheduleList.appendChild(item);
  });

  scheduleList.querySelectorAll("[data-schedule-input]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.scheduleInput);
      state.schedule[index].task = event.target.value;
      saveState();
    });
  });

  scheduleList.querySelectorAll("[data-schedule-check]").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const index = Number(event.target.dataset.scheduleCheck);
      state.schedule[index].done = event.target.checked;
      saveState();
      renderSchedule();
      refreshStats();
    });
  });
}

function renderHabits() {
  habitList.innerHTML = "";

  state.habits.forEach((habit, index) => {
    const item = document.createElement("article");
    item.className = "habit-item";
    item.innerHTML = `
      <label class="habit-top">
        <input type="checkbox" data-habit-check="${index}" ${habit.done ? "checked" : ""}>
        <strong>${habit.name}</strong>
      </label>
      <p class="habit-meta">把这条守住，整天的秩序感就稳很多。</p>
    `;
    habitList.appendChild(item);
  });

  habitList.querySelectorAll("[data-habit-check]").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const index = Number(event.target.dataset.habitCheck);
      state.habits[index].done = event.target.checked;
      saveState();
      refreshStats();
    });
  });
}

function refreshStats() {
  const doneCount = state.schedule.filter((item) => item.done).length;
  const habitsDone = state.habits.filter((item) => item.done).length;
  const total = state.schedule.length + state.habits.length;
  const completed = doneCount + habitsDone;
  const rate = Math.round((completed / total) * 100);

  completionRate.textContent = `${rate}%`;
  checkedCount.textContent = `${doneCount} / ${state.schedule.length}`;
  habitScore.textContent = `${habitsDone} / ${state.habits.length}`;
}

function refreshCurrentSlot() {
  const currentIndex = scheduleTemplate.findIndex(([time]) => isCurrentSlot(time));

  if (currentIndex === -1) {
    nowTime.textContent = "现在不在计划时段内";
    nowTask.textContent = "你可以先休息，或者提前看看下一个时段。";
    renderSchedule();
    return;
  }

  const [time] = scheduleTemplate[currentIndex];
  nowTime.textContent = `${time} 现在该做什么`;
  nowTask.textContent = state.schedule[currentIndex].task || "这个时段还没填安排。";
  renderSchedule();
}

function isCurrentSlot(timeRange) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startText, endText] = timeRange.split(" - ");
  const startMinutes = toMinutes(startText);
  const endMinutes = toMinutes(endText);
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function toMinutes(text) {
  const [hours, minutes] = text.split(":").map(Number);
  return hours * 60 + minutes;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
