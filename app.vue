<template>
  <div class="page" :class="{ 'page--locked': showLogin || isAdmin, 'page--chat-landing': isChatLanding }" @copy.prevent @cut.prevent @contextmenu.prevent @selectstart.prevent @dragstart.prevent>
    <div class="bg-glow" aria-hidden="true"></div>
    <div class="bg-grain" aria-hidden="true"></div>
    <!-- truncated for tool call, will use full later -->
