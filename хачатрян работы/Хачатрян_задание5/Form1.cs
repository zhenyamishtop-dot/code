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
        String File_name = "Noname.rtf";

        public Form1()
        {
            InitializeComponent();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            string dir = Path.GetFullPath(Path.Combine(Application.StartupPath, @"..\..\Тексты"));
            openFileDialog1.InitialDirectory = dir;
            saveFileDialog1.InitialDirectory = dir;
            ShowFileName();
        }

        private void ShowFileName()
        {
            Text = "Маленький текстовый редактор - " + Path.GetFileName(File_name);
        }

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

        private void создатьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            AskSave("Создать");
            richTextBox1.Clear();
            richTextBox1.Modified = false;
            File_name = "Noname.rtf";
            ShowFileName();
        }

        private void открытьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            AskSave("Открыть");
            openFileDialog1.FileName = Path.GetFileName(File_name);
            if (openFileDialog1.ShowDialog() == DialogResult.OK)
            {
                File_name = openFileDialog1.FileName;
                richTextBox1.LoadFile(File_name, RichTextBoxStreamType.RichText);
                richTextBox1.Modified = false;
                ShowFileName();
            }
        }

        private void сохранитьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            if (File_name == "Noname.rtf")
                сохранитькакToolStripMenuItem_Click(sender, e);
            else
            {
                richTextBox1.SaveFile(File_name, RichTextBoxStreamType.RichText);
                richTextBox1.Modified = false;
            }
        }

        private void сохранитькакToolStripMenuItem_Click(object sender, EventArgs e)
        {
            saveFileDialog1.FileName = Path.GetFileName(File_name);
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

        private void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            AskSave("Выход");
        }

        private void toolStrip1_ItemClicked(object sender, ToolStripItemClickedEventArgs e)
        {
            switch (toolStrip1.Items.IndexOf(e.ClickedItem))
            {
                case 0: { создатьToolStripMenuItem_Click(sender, e); break; }
                case 1: { открытьToolStripMenuItem_Click(sender, e); break; }
                case 2: { сохранитьToolStripMenuItem_Click(sender, e); break; }
            }
        }
    }
}
