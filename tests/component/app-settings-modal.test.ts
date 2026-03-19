import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import App from "@/App.vue";
import router from "@/router";

async function mountApp() {
  await router.push("/projects");
  await router.isReady();

  const wrapper = mount(App, {
    global: {
      plugins: [router],
    },
  });

  await flushPromises();

  return wrapper;
}

describe("App settings dialog", () => {
  it("opens the token modal automatically on first launch", async () => {
    window.electronAPI.settings.get = vi.fn().mockResolvedValue({
      hasToken: false,
    });

    const wrapper = await mountApp();

    expect(window.electronAPI.settings.get).toHaveBeenCalled();
    expect(wrapper.text()).toContain("Введите токен доступа");
  });

  it("opens the modal from the header and saves the token", async () => {
    window.electronAPI.settings.get = vi.fn().mockResolvedValue({
      hasToken: true,
    });
    window.electronAPI.settings.saveToken = vi.fn().mockResolvedValue({
      hasToken: true,
    });

    const wrapper = await mountApp();

    await wrapper.get('button[aria-label="Открыть настройки"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Введите токен доступа");

    await wrapper.get("#settings-access-token").setValue(
      "http://video2book.test/invite/52f1465a-4318-475f-87dd-4aa3cdc9f269",
    );
    await wrapper.get("form").trigger("submit.prevent");
    await flushPromises();

    expect(window.electronAPI.settings.saveToken).toHaveBeenCalledWith(
      "http://video2book.test/invite/52f1465a-4318-475f-87dd-4aa3cdc9f269",
    );
    expect(wrapper.text()).not.toContain("Введите токен доступа");
  });
});
