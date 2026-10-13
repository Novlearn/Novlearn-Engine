using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

// Windows 10+ only. Atomic job assignment avoids the suspended-process orphan
// window. The noninheritable job handle belongs only to this launcher.
public static class NovlearnJob {
  public static int Main(string[] args) {
    if (args.Length != 6) return 70;
    ulong memory; int heap, input, timeout;
    if (!UInt64.TryParse(args[2], out memory) || !Int32.TryParse(args[3], out heap) || !Int32.TryParse(args[4], out input) || !Int32.TryParse(args[5], out timeout)
      || memory < 64UL * 1024 * 1024 || memory > 2048UL * 1024 * 1024
      || heap < 16 || heap > 512 || input < 1024 || input > 1048576 || timeout < 1 || timeout > 60000) return 70;
    return Run(args[0], args[1], memory, heap, input, timeout);
  }
  [StructLayout(LayoutKind.Sequential)] struct Basic {
    public long ProcessTime, JobTime;
    public uint Flags;
    public UIntPtr MinWorkingSet, MaxWorkingSet;
    public uint ActiveProcesses;
    public UIntPtr Affinity;
    public uint Priority, Scheduling;
  }
  [StructLayout(LayoutKind.Sequential)] struct Io {
    public ulong ReadOps, WriteOps, OtherOps, ReadBytes, WriteBytes, OtherBytes;
  }
  [StructLayout(LayoutKind.Sequential)] struct Extended {
    public Basic Basic;
    public Io Io;
    public UIntPtr ProcessMemory, JobMemory, PeakProcessMemory, PeakJobMemory;
  }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct Startup {
    public uint Size;
    public string Reserved, Desktop, Title;
    public uint X, Y, XSize, YSize, XChars, YChars, Fill, Flags;
    public ushort Show, ReservedSize;
    public IntPtr ReservedBytes, Input, Output, Error;
  }
  [StructLayout(LayoutKind.Sequential)] struct StartupEx {
    public Startup Startup;
    public IntPtr Attributes;
  }
  [StructLayout(LayoutKind.Sequential)] struct ProcessInfo {
    public IntPtr Process, Thread;
    public uint Pid, Tid;
  }
  [StructLayout(LayoutKind.Sequential)] struct Security {
    public int Length;
    public IntPtr Descriptor;
    public int Inherit;
  }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern IntPtr CreateJobObjectW(IntPtr attributes, string name);
  [DllImport("kernel32.dll", SetLastError=true)]
  static extern bool SetInformationJobObject(IntPtr job, int kind, ref Extended info, uint length);
  [DllImport("kernel32.dll", SetLastError=true)]
  static extern bool QueryInformationJobObject(IntPtr job, int kind, out Extended info, uint length, IntPtr returned);
  [DllImport("kernel32.dll", SetLastError=true)]
  static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags, ref UIntPtr size);
  [DllImport("kernel32.dll", SetLastError=true)]
  static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, UIntPtr kind, IntPtr value, UIntPtr size, IntPtr previous, IntPtr returned);
  [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern bool CreateProcessW(string application, StringBuilder command, IntPtr processSecurity, IntPtr threadSecurity,
    bool inherit, uint flags, IntPtr environment, string directory, ref StartupEx startup, out ProcessInfo process);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool CreatePipe(out IntPtr read, out IntPtr write, ref Security security, uint size);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetHandleInformation(IntPtr handle, uint mask, uint flags);
  [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int kind);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle, uint timeout);
  [DllImport("kernel32.dll", SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr process, out uint code);
  [DllImport("kernel32.dll")] static extern bool TerminateJobObject(IntPtr job, uint code);
  [DllImport("kernel32.dll")] static extern uint SetErrorMode(uint mode);

  static void Check(bool ok) { if (!ok) throw new Win32Exception(Marshal.GetLastWin32Error()); }
  static string Quote(string text) {
    // Trusted fixed paths, encoded for CreateProcess (no shell).
    StringBuilder output = new StringBuilder("\"");
    int slashes = 0;
    foreach (char c in text) {
      if (c == '\\') { slashes++; continue; }
      if (c == '"') output.Append('\\', slashes * 2 + 1);
      else output.Append('\\', slashes);
      slashes = 0; output.Append(c);
    }
    output.Append('\\', slashes * 2); output.Append('"'); return output.ToString();
  }
  static void Frame(string text) {
    byte[] bytes = Encoding.UTF8.GetBytes(text + "\n");
    Stream output = Console.OpenStandardOutput();
    output.Write(bytes, 0, bytes.Length); output.Flush();
  }
  public static int Run(string node, string worker, ulong memory, int heap, int inputLimit, int timeout) {
    IntPtr job = IntPtr.Zero, attributes = IntPtr.Zero, jobs = IntPtr.Zero, handles = IntPtr.Zero;
    IntPtr inputRead = IntPtr.Zero, inputWrite = IntPtr.Zero;
    ProcessInfo process = new ProcessInfo(); bool initialized = false;
    try {
      if (IntPtr.Size != 8 || !Path.IsPathRooted(node) || !Path.IsPathRooted(worker)) return 70;
      SetErrorMode(0x0001 | 0x0002); // no interactive crash/error dialogs
      job = CreateJobObjectW(IntPtr.Zero, null); Check(job != IntPtr.Zero);
      Extended limits = new Extended();
      limits.Basic.Flags = 0x2000 | 0x100 | 0x200 | 0x8;
      limits.Basic.ActiveProcesses = 1;
      limits.ProcessMemory = new UIntPtr(memory); limits.JobMemory = new UIntPtr(memory);
      Check(SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(typeof(Extended))));
      Security pipeSecurity = new Security();
      pipeSecurity.Length = Marshal.SizeOf(typeof(Security)); pipeSecurity.Inherit = 1;
      Check(CreatePipe(out inputRead, out inputWrite, ref pipeSecurity, 0));
      Check(SetHandleInformation(inputWrite, 1, 0));
      IntPtr output = GetStdHandle(-11), error = GetStdHandle(-12);
      Check(SetHandleInformation(output, 1, 1)); Check(SetHandleInformation(error, 1, 1));
      UIntPtr size = UIntPtr.Zero;
      InitializeProcThreadAttributeList(IntPtr.Zero, 2, 0, ref size);
      attributes = Marshal.AllocHGlobal(checked((int)size.ToUInt64()));
      Check(InitializeProcThreadAttributeList(attributes, 2, 0, ref size)); initialized = true;
      jobs = Marshal.AllocHGlobal(IntPtr.Size); Marshal.WriteIntPtr(jobs, job);
      Check(UpdateProcThreadAttribute(attributes, 0, new UIntPtr(0x2000D), jobs, new UIntPtr((uint)IntPtr.Size), IntPtr.Zero, IntPtr.Zero));
      handles = Marshal.AllocHGlobal(3 * IntPtr.Size);
      Marshal.WriteIntPtr(handles, 0, inputRead); Marshal.WriteIntPtr(handles, IntPtr.Size, output);
      Marshal.WriteIntPtr(handles, 2 * IntPtr.Size, error);
      Check(UpdateProcThreadAttribute(attributes, 0, new UIntPtr(0x20002), handles, new UIntPtr((uint)(3 * IntPtr.Size)), IntPtr.Zero, IntPtr.Zero));
      StartupEx startup = new StartupEx();
      startup.Startup.Size = (uint)Marshal.SizeOf(typeof(StartupEx)); startup.Startup.Flags = 0x100;
      startup.Startup.Input = inputRead; startup.Startup.Output = output; startup.Startup.Error = error;
      startup.Attributes = attributes;
      StringBuilder command = new StringBuilder(Quote(node) + " --max-old-space-size=" + heap + " " + Quote(worker));
      Check(CreateProcessW(node, command, IntPtr.Zero, IntPtr.Zero, true, 0x80000 | 0x08000000 | 0x4,
        IntPtr.Zero, null, ref startup, out process));
      CloseHandle(inputRead); inputRead = IntPtr.Zero;
      Frame("{\"runtime\":1,\"event\":\"started\",\"pid\":" + process.Pid + ",\"memoryLimitBytes\":" + memory + "}");
      // Native watchdog remains effective when the Node parent's event loop stalls.
      IntPtr timedProcess = process.Process;
      Thread watchdog = new Thread(delegate() {
        if (WaitForSingleObject(timedProcess, (uint)timeout) == 0x102) Environment.Exit(75);
      });
      watchdog.IsBackground = true; watchdog.Start();
      // Job assignment was atomic; suspension is only for stdout frame ordering.
      Check(ResumeThread(process.Thread) != 0xFFFFFFFF);
      Stream input = Console.OpenStandardInput();
      MemoryStream request = new MemoryStream(); int next;
      while ((next = input.ReadByte()) != -1 && next != 10) {
        if (request.Length >= inputLimit) return 71;
        request.WriteByte((byte)next);
      }
      if (next == -1) return 71;
      using (FileStream childInput = new FileStream(new Microsoft.Win32.SafeHandles.SafeFileHandle(inputWrite, true), FileAccess.Write)) {
        inputWrite = IntPtr.Zero;
        byte[] data = request.ToArray(); childInput.Write(data, 0, data.Length); childInput.Flush();
      }
      // Parent owns a lifetime pipe. EOF from parent crash closes the job too.
      IntPtr watchedJob = job;
      Thread lifetime = new Thread(delegate() {
        try { while (input.ReadByte() != -1) {} } catch (IOException) {}
        TerminateJobObject(watchedJob, 72);
      });
      lifetime.IsBackground = true; lifetime.Start();
      Check(WaitForSingleObject(process.Process, 0xFFFFFFFF) == 0);
      uint exit; Check(GetExitCodeProcess(process.Process, out exit));
      Extended observed;
      Check(QueryInformationJobObject(job, 9, out observed, (uint)Marshal.SizeOf(typeof(Extended)), IntPtr.Zero));
      Frame("{\"runtime\":1,\"event\":\"finished\",\"pid\":" + process.Pid + ",\"exitCode\":" + exit +
        ",\"peakCommittedBytes\":" + observed.PeakProcessMemory.ToUInt64() + "}");
      return exit == 0 ? 0 : 73;
    } catch (Exception failure) {
      Console.Error.WriteLine("launcher-unavailable:" + (failure is Win32Exception ? ((Win32Exception)failure).NativeErrorCode.ToString() : failure.GetType().Name)); return 70;
    } finally {
      if (job != IntPtr.Zero) { TerminateJobObject(job, 74); CloseHandle(job); }
      if (process.Thread != IntPtr.Zero) CloseHandle(process.Thread);
      if (process.Process != IntPtr.Zero) CloseHandle(process.Process);
      if (inputRead != IntPtr.Zero) CloseHandle(inputRead);
      if (inputWrite != IntPtr.Zero) CloseHandle(inputWrite);
      if (initialized) DeleteProcThreadAttributeList(attributes);
      if (attributes != IntPtr.Zero) Marshal.FreeHGlobal(attributes);
      if (jobs != IntPtr.Zero) Marshal.FreeHGlobal(jobs);
      if (handles != IntPtr.Zero) Marshal.FreeHGlobal(handles);
    }
  }
}
