<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { LogOut, Moon, Sun, UserRound } from '@lucide/vue'
import { useLogout } from '@/composables/useLogout'
import { useTheme } from '@/composables/useTheme'
import { NAV_ITEMS, type NavItem } from '@/router/nav'

const route = useRoute()
const logout = useLogout()
const { isDark, toggleTheme } = useTheme()

function isActive(item: NavItem) {
  const name = String(route.name ?? '')
  return name === item.name || (item.activeFor?.includes(name) ?? false)
}
</script>

<template>
  <header class="app-header">
    <RouterLink :to="{ name: 'dashboard' }" class="app-header__brand" aria-label="Icarus home">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 2 16.5 3.5L13 7 4.8 5.2c-.5-.1-.9.1-1.1.5L2 8c-.2.5 0 1.1.5 1.3L8 11l-1.5 2H4l-1 1 2 2 2 2 1-1v-2.5L10 13l2 5.5c.2.5.8.7 1.3.5l2.5-1.5c.4-.2.6-.6.5-1.1z"/>
      </svg>
      <span class="app-header__wordmark">Icarus</span>
    </RouterLink>

    <nav class="app-header__links" aria-label="Main navigation">
      <RouterLink
        v-for="item in NAV_ITEMS"
        :key="item.name"
        :to="{ name: item.name }"
        class="app-header__link"
        :class="{ 'app-header__link--active': isActive(item) }"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="app-header__actions">
      <Button
        variant="ghost"
        size="icon"
        @click="toggleTheme"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        <Sun v-if="isDark" :size="18" />
        <Moon v-else :size="18" />
      </Button>
      <Button variant="ghost" size="icon" :as="RouterLink" :to="{ name: 'settings' }" aria-label="Settings">
        <UserRound :size="18" />
      </Button>
      <Button variant="ghost" size="icon" @click="logout" aria-label="Sign out">
        <LogOut :size="18" />
      </Button>
    </div>
  </header>
</template>

<style scoped lang="scss">
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 3.25rem;
  border-bottom: 1px solid var(--border);
  background: var(--card);
  flex-shrink: 0;

  &__brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--foreground);
    text-decoration: none;
  }

  &__wordmark {
    font-size: 0.9375rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  &__links {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  &__link {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--muted-foreground);
    text-decoration: none;
    padding: 0.3rem 0.75rem;
    border-radius: var(--radius);
    transition: color 0.15s, background 0.15s;

    &:hover {
      color: var(--foreground);
      background: var(--accent);
    }

    &--active {
      color: var(--foreground);
      background: var(--accent);
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0.125rem;
  }
}
</style>
