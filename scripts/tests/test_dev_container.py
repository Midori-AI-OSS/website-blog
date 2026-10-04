"""Exercise destructive lifecycle boundaries without touching real Docker state."""

import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


HELPER = Path(__file__).resolve().parents[1] / "dev-container.sh"
FAKE_DOCKER = r'''#!/usr/bin/env python3
import fcntl
import json
import os
import sys
from pathlib import Path

state_file = Path(os.environ["FAKE_DOCKER_STATE"])
lock = state_file.with_suffix(".lock").open("w")
fcntl.flock(lock, fcntl.LOCK_EX)
state = json.loads(state_file.read_text())
args = sys.argv[1:]
state["calls"].append(args)
result = ""
code = 0

if ((args[:2] == ["container", "inspect"] and state.get("fail_inspect"))
    or (args[:2] == ["container", "rm"] and state.get("fail_remove"))
    or (args[0] == "compose" and "up" in args and state.get("fail_up"))):
    state_file.write_text(json.dumps(state))
    sys.exit(1)

def owned_container():
    return dict(state["template"], status="running")

if args[0] == "info":
    if state.get("daemon_failure"):
        code = 1
elif args[:2] == ["image", "inspect"]:
    code = 0 if state.get("image", True) else 1
elif args[0] == "ps":
    if "-a" in args:
        result = "website-blog-dev" if state.get("container") else ""
    else:
        names = list(state.get("others", {}))
        if (state.get("container") or {}).get("status") == "running":
            names.append("owned-id")
        result = "\n".join(names)
elif args[:2] == ["container", "inspect"]:
    name = args[-1]
    template = args[args.index("--format") + 1]
    if name in state.get("others", {}):
        result = "\n".join(state["others"][name])
    else:
        container = state.get("container")
        if not container:
            code = 1
        elif "managed" in template:
            result = container["owned"]
        elif "checkout" in template:
            result = container["checkout"]
        elif "NanoCpus" in template:
            result = container["cpu"]
        elif "RestartPolicy" in template:
            result = container["lifecycle"]
        elif ".Config.Env" in template:
            result = container["environment"]
        elif ".Mounts" in template:
            result = container["mount"]
        elif ".State.Status" in template:
            result = container["status"]
        else:
            raise AssertionError("Unhandled inspect: " + template)
elif args[:2] == ["container", "stop"]:
    state["container"]["status"] = "exited"
elif args[:2] == ["container", "rm"]:
    if state["container"]["status"] == "running":
        code = 1
    else:
        state["container"] = None
elif args[0] == "compose":
    if "build" in args:
        code = state.get("build_exit", 0)
        state["image"] = code == 0
    elif "up" in args:
        state["container"] = owned_container()
elif args[0] == "exec":
    code = state.get("exec_exit", 0)
else:
    raise AssertionError("Unhandled Docker call: " + repr(args))

state_file.write_text(json.dumps(state))
if result:
    print(result)
sys.exit(code)
'''


class DevContainerTest(unittest.TestCase):
    def setUp(self):
        self.assertTrue(HELPER.exists(), "Development-container helper is missing")
        self.temporary = tempfile.TemporaryDirectory(prefix="dev-container-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "checkout with spaces"
        (self.root / "scripts").mkdir(parents=True)
        shutil.copy2(HELPER, self.root / "scripts/dev-container.sh")
        (self.root / "docker-compose.dev.yaml").touch()
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        self.bin = Path(self.temporary.name) / "bin"
        self.bin.mkdir()
        docker = self.bin / "docker"
        docker.write_text(FAKE_DOCKER)
        docker.chmod(0o755)
        self.state_file = Path(self.temporary.name) / "state.json"
        self.template = {
            "owned": "true", "checkout": str(self.root),
            "mount": f"bind\t{self.root}\ttrue", "cpu": "1000000000",
            "lifecycle": f'no|true|/app|{os.getuid()}:{os.getgid()}|["/usr/bin/bash","-c","exec sleep 43200"]',
            "environment": "\n".join([
                "UV_PROJECT_ENVIRONMENT=/tmp/website-blog-venv",
                "UV_CACHE_DIR=/tmp/uv-cache",
                "UV_PYTHON_INSTALL_DIR=/tmp/uv-python",
                "BUN_INSTALL_CACHE_DIR=/tmp/bun-cache",
                "BUN_RUNTIME_TRANSPILER_CACHE_PATH=/tmp/bun-transpiler-cache",
                "HF_HOME=/tmp/huggingface",
            ]),
        }
        self.state = {"calls": [], "container": None, "others": {}, "template": self.template}
        self.save()
        self.env = dict(os.environ, PATH=f"{self.bin}:{os.environ['PATH']}",
                        FAKE_DOCKER_STATE=str(self.state_file))
        self.modules = self.root / "node_modules"
        self.modules.mkdir()
        (self.modules / "stale-package").write_text("stale")

    def save(self):
        self.state_file.write_text(json.dumps(self.state))

    def load(self):
        return json.loads(self.state_file.read_text())

    def owned(self, status="running"):
        self.state["container"] = dict(self.template, status=status)
        self.save()

    def run_helper(self, *args, cwd=None):
        return subprocess.run(["bash", str(self.root / "scripts/dev-container.sh"), *args],
                              env=self.env, cwd=cwd or self.root,
                              capture_output=True, text=True)

    def test_fresh_start_removes_stale_modules(self):
        result = self.run_helper("start", cwd=self.root / "scripts")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(self.modules.exists())
        self.assertEqual(self.load()["container"]["status"], "running")

    def test_reuse_preserves_modules_and_does_not_rebuild(self):
        self.owned()
        self.assertEqual(self.run_helper("start").returncode, 0)
        self.assertTrue((self.modules / "stale-package").exists())
        self.assertFalse(any("up" in call or "build" in call for call in self.load()["calls"]))

    def test_restart_cleans_modules_after_stopping(self):
        self.owned()
        result = self.run_helper("restart")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(self.modules.exists())
        calls = self.load()["calls"]
        stop = next(i for i, call in enumerate(calls) if call[:2] == ["container", "stop"])
        remove = next(i for i, call in enumerate(calls) if call[:2] == ["container", "rm"])
        start = next(i for i, call in enumerate(calls) if "up" in call)
        self.assertLess(stop, remove)
        self.assertLess(remove, start)

    def test_expired_container_is_replaced(self):
        self.owned("exited")
        self.assertEqual(self.run_helper("start").returncode, 0)
        self.assertFalse(self.modules.exists())
        self.assertEqual(self.load()["container"]["status"], "running")

    def test_module_symlink_is_removed_without_following_target(self):
        shutil.rmtree(self.modules)
        target = Path(self.temporary.name) / "external-packages"
        target.mkdir()
        (target / "keep").touch()
        self.modules.symlink_to(target, target_is_directory=True)
        self.assertEqual(self.run_helper("start").returncode, 0)
        self.assertFalse(self.modules.is_symlink())
        self.assertTrue((target / "keep").exists())

    def test_foreign_container_is_untouched(self):
        self.owned()
        self.state["container"]["owned"] = "false"
        self.save()
        self.assertNotEqual(self.run_helper("restart").returncode, 0)
        self.assertTrue(self.modules.exists())
        self.assertEqual(self.load()["container"]["status"], "running")

    def test_other_checkout_and_wrong_cpu_are_rejected(self):
        for field, value in [("checkout", "/other-checkout"), ("cpu", "2000000000"),
                             ("mount", "bind\t/other-checkout\ttrue")]:
            with self.subTest(field=field):
                self.owned()
                self.state["container"][field] = value
                self.save()
                self.assertNotEqual(self.run_helper("start").returncode, 0)
                self.assertTrue(self.modules.exists())

    def test_changed_lifetime_or_external_venv_is_rejected_without_cleanup(self):
        for field, value in [
            ("lifecycle", self.template["lifecycle"].replace("no|", "always|", 1)),
            ("lifecycle", self.template["lifecycle"].replace("43200", "86400")),
            ("environment", self.template["environment"].replace("/tmp/website-blog-venv", "/app/tts/.venv")),
        ]:
            with self.subTest(value=value):
                self.owned()
                self.state["container"][field] = value
                self.save()
                self.assertNotEqual(self.run_helper("start").returncode, 0)
                self.assertTrue(self.modules.exists())

    def test_simultaneous_fresh_starts_create_only_one_container(self):
        processes = [subprocess.Popen(
            ["bash", str(self.root / "scripts/dev-container.sh"), "start"],
            env=self.env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        ) for _ in range(2)]
        for process in processes:
            _, errors = process.communicate(timeout=20)
            self.assertEqual(process.returncode, 0, errors)
        self.assertEqual(sum("up" in call for call in self.load()["calls"]), 1)
        self.assertEqual(self.load()["container"]["status"], "running")

    def test_running_production_container_prevents_cleanup(self):
        for source in [str(self.root), str(self.root.parent), str(self.modules)]:
            with self.subTest(source=source):
                self.state["others"] = {"production-id": [source]}
                self.save()
                self.assertNotEqual(self.run_helper("start").returncode, 0)
                self.assertTrue(self.modules.exists())
                self.assertIsNone(self.load()["container"])

    def test_unrelated_container_does_not_prevent_startup(self):
        self.state["others"] = {"unrelated-id": ["/unrelated"]}
        self.save()
        self.assertEqual(self.run_helper("start").returncode, 0)

    def test_exec_preserves_arguments_and_exit_status(self):
        self.owned()
        self.state["exec_exit"] = 23
        self.save()
        result = self.run_helper("exec", "printf", "%s", "one argument; $(touch nope)")
        self.assertEqual(result.returncode, 23)
        self.assertEqual(self.load()["calls"][-1][-3:],
                         ["printf", "%s", "one argument; $(touch nope)"])
        self.assertFalse((self.root / "nope").exists())

    def test_shell_opens_bash_in_app(self):
        self.owned()
        self.assertEqual(self.run_helper("shell").returncode, 0)
        call = self.load()["calls"][-1]
        self.assertEqual(call[-2:], ["website-blog-dev", "/usr/bin/bash"])
        self.assertEqual(call[call.index("--workdir") + 1], "/app")

    def test_inspection_error_preserves_modules_and_running_container(self):
        self.owned()
        self.state["fail_inspect"] = True
        self.save()
        self.assertNotEqual(self.run_helper("restart").returncode, 0)
        self.assertTrue(self.modules.exists())
        self.assertEqual(self.load()["container"]["status"], "running")

    def test_container_removal_error_preserves_modules(self):
        self.owned("exited")
        self.state["fail_remove"] = True
        self.save()
        self.assertNotEqual(self.run_helper("start").returncode, 0)
        self.assertTrue(self.modules.exists())
        self.assertIsNotNone(self.load()["container"])

    def test_startup_error_never_cleans_other_directories(self):
        next_output = self.root / ".next"
        next_output.mkdir()
        (next_output / "keep").touch()
        venv = self.root / "tts/.venv"
        venv.mkdir(parents=True)
        (venv / "keep").touch()
        self.state["fail_up"] = True
        self.save()
        self.assertNotEqual(self.run_helper("start").returncode, 0)
        self.assertFalse(self.modules.exists())
        self.assertIsNone(self.load()["container"])
        self.assertTrue((next_output / "keep").exists())
        self.assertTrue((venv / "keep").exists())

    def test_status_and_invalid_commands_do_not_start_or_clean(self):
        for args in [("status",), ("exec",), ("unknown",), ("stop",)]:
            with self.subTest(args=args):
                self.run_helper(*args)
                self.assertTrue(self.modules.exists())
                self.assertIsNone(self.load()["container"])

    def test_daemon_or_build_failure_preserves_modules(self):
        for failure in [{"daemon_failure": True}, {"image": False, "build_exit": 1}]:
            with self.subTest(failure=failure):
                self.state = {"calls": [], "container": None, "others": {}, "template": self.template, **failure}
                self.save()
                self.assertNotEqual(self.run_helper("start").returncode, 0)
                self.assertTrue(self.modules.exists())

    def test_cleanup_failure_prevents_startup(self):
        if os.geteuid() == 0:
            self.skipTest("Root bypasses the permission failure being tested")
        self.root.chmod(0o555)
        self.addCleanup(self.root.chmod, 0o755)
        result = self.run_helper("start")
        self.assertNotEqual(result.returncode, 0)
        self.assertIsNone(self.load()["container"])


if __name__ == "__main__":
    unittest.main()
