using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Хачатрян_задание5
{
    public partial class Form1 : Form
    {
        // Имя файла, который сейчас в окне редактирования.
        String File_name = "Noname.rtf";

        public Form1()
        {
            InitializeComponent();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            // Тексты для проверки лежат в папке проекта "Тексты".
            string dir = Path.GetFullPath(Path.Combine(Application.StartupPath, @"..\..\Тексты"));
            openFileDialog1.InitialDirectory = dir;
            saveFileDialog1.InitialDirectory = dir;
            ShowFileName();
        }

        // Имя файла в заголовке окна (без пути).
        private void ShowFileName()
        {
            Text = "Маленький текстовый редактор - " + Path.GetFileName(File_name);
        }

        // Если текст менялся, предложить сохранить.
        private void AskSave(string caption)
        {
            if (richTextBox1.Modified == true)
            {
                var result = MessageBox.Show("Сохранить изменения в файле " + Path.GetFileName(File_name) + "?",
                                             caption, MessageBoxButtons.YesNo, MessageBoxIcon.Question);
                if (result == DialogResult.Yes)
                    сохранитьToolStripMenuItem_Click(this, EventArgs.Empty);
            }
        }

        // Создать.
        private void создатьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            AskSave("Создать");
            richTextBox1.Clear();
            richTextBox1.Modified = false;
            File_name = "Noname.rtf";
            ShowFileName();
        }

        // Открыть файл.
        private void открытьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            AskSave("Открыть");
            // Имя файла в поле ввода имени.
            openFileDialog1.FileName = Path.GetFileName(File_name);
            // Показать диалог и ждать ОК.
            if (openFileDialog1.ShowDialog() == DialogResult.OK)
            {
                File_name = openFileDialog1.FileName;
                richTextBox1.LoadFile(File_name, RichTextBoxStreamType.RichText);
                richTextBox1.Modified = false;
                ShowFileName();
            }
        }

        // Быстрое сохранение.
        private void сохранитьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            // Файл ни разу не сохранялся - тогда "Сохранить как".
            if (File_name == "Noname.rtf")
                сохранитькакToolStripMenuItem_Click(sender, e);
            else
            {
                richTextBox1.SaveFile(File_name, RichTextBoxStreamType.RichText);
                richTextBox1.Modified = false;
            }
        }

        // Сохранить с именем.
        private void сохранитькакToolStripMenuItem_Click(object sender, EventArgs e)
        {
            saveFileDialog1.FileName = Path.GetFileName(File_name);
            // Расширение .rtf диалог допишет сам (DefaultExt = rtf).
            if (saveFileDialog1.ShowDialog() == DialogResult.OK)
            {
                File_name = saveFileDialog1.FileName;
                richTextBox1.SaveFile(File_name, RichTextBoxStreamType.RichText);
                richTextBox1.Modified = false;
                ShowFileName();
            }
        }

        private void выходToolStripMenuItem_Click(object sender, EventArgs e)
        {
            Close();
        }

        // При закрытии окна (и через меню, и крестиком) предложить сохранить.
        private void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            AskSave("Выход");
        }

        // Кнопки панели инструментов дублируют пункты меню.
        private void toolStrip1_ItemClicked(object sender, ToolStripItemClickedEventArgs e)
        {
            switch (toolStrip1.Items.IndexOf(e.ClickedItem))
            {
                case 0: { /*Создать*/   создатьToolStripMenuItem_Click(sender, e); break; }
                case 1: { /*Открыть*/   открытьToolStripMenuItem_Click(sender, e); break; }
                case 2: { /*Сохранить*/ сохранитьToolStripMenuItem_Click(sender, e); break; }
            }
        }
    }
}
